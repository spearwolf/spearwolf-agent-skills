#!/usr/bin/env bash
#
# remediate.sh — die Schleife aus Schritt 6 von js-ts-audit-remediation.
#
# Sie trifft keine inhaltliche Entscheidung. Sie liest die Marken im Plan,
# startet je Paket zwei Runner-Prozesse, prüft deren Rückgabe gegen git und
# das Verify-Log, und hört auf, wenn kein Paket mehr offen ist. Alles, was
# ein Urteil verlangt, liegt davor (Schritt 1-5) und danach (Schritt 7).
#
# Aufruf im Wurzelverzeichnis des Zielprojekts, nachdem der Grobplan
# freigegeben ist:
#
#   <skill>/scripts/remediate.sh [--once] [--dry-run] [--help]
#
# Alles Weitere steht in references/shell-runner.md.

set -euo pipefail

# --- Exit-Codes (siehe references/shell-runner.md) --------------------------
EX_OK=0        # kein Paket mehr offen, der Abschluss folgt
EX_ASK=10      # ein Runner legt dem Nutzer etwas vor
EX_RESUME=11   # ein Paket steht auf [~], ein früherer Lauf ist mittendrin gestorben
EX_CONTRACT=20 # die Rückgabe passt nicht zu dem, was im Repo steht
EX_PERM=21     # ein Runner hing an einer Rechteschranke
EX_AGENT=30    # der Runner-Prozess selbst ist gescheitert
EX_PRE=40      # eine Vorbedingung stimmt nicht

# --- Stellschrauben, alle über die Umgebung überschreibbar ------------------
PLAN=${PLAN:-./remediation-plan.md}
MODEL_A=${MODEL_A:-opus}        # Zug 0: Abgleich, Triage, Detailplan
EFFORT_A=${EFFORT_A:-xhigh}
MODEL_B=${MODEL_B:-opus}        # Zug 1-5: beauftragen, prüfen, verifizieren, committen
EFFORT_B=${EFFORT_B:-medium}   # nur der Vorgabewert; »- Effort:« im Detailplan schlägt ihn
PERM=${PERM:-acceptEdits}
BUDGET_USD=${BUDGET_USD:-15}    # harte Obergrenze je Runner-Prozess
MAX_ITER=${MAX_ITER:-200}       # Reißleine gegen eine Schleife ohne Fortschritt

ONCE=0
DRY=0

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
SKILL_DIR=$(cd -- "$SCRIPT_DIR/.." && pwd)
SCHEMA="$SKILL_DIR/assets/runner-return.schema.json"

TOTAL_COST=0
PACKAGES_DONE=0
RES=""   # die geprüfte Rückgabe des zuletzt gelaufenen Runners
RAW=""   # der Pfad zu seinem vollständigen Ergebnis-JSON

# --- Ausgabe ----------------------------------------------------------------

say()  { printf '%s\n' "$*"; }
warn() { printf 'WARNUNG: %s\n' "$*" >&2; }

die() { # $1 = Exit-Code, Rest = Meldung
  local code=$1; shift
  printf 'ABBRUCH (%s): %s\n' "$code" "$*" >&2
  exit "$code"
}

journal() { # eine Zeile je Paket, damit ein Lauf nachvollziehbar bleibt
  [ -n "${WORK:-}" ] || return 0
  printf '%s\t%s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*" >> "$WORK/remediate.log"
}

usage() {
  sed -n '3,17p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
  cat <<'EOF'

Optionen:
  --once      nach dem ersten Runner anhalten. Für den ersten Probelauf.
  --dry-run   nur zeigen, was beauftragt würde. Startet keinen Prozess.
  --help      diese Ausgabe.

Umgebung:
  PLAN MODEL_A EFFORT_A MODEL_B EFFORT_B PERM BUDGET_USD MAX_ITER
EOF
}

# --- Werkzeuge --------------------------------------------------------------

uuid() {
  if command -v uuidgen >/dev/null 2>&1; then
    uuidgen | tr 'A-Z' 'a-z'
  elif [ -r /proc/sys/kernel/random/uuid ]; then
    cat /proc/sys/kernel/random/uuid
  elif command -v python3 >/dev/null 2>&1; then
    python3 -c 'import uuid; print(uuid.uuid4())'
  else
    die $EX_PRE "keine Quelle für eine UUID gefunden: weder uuidgen noch /proc/sys/kernel/random/uuid noch python3"
  fi
}

head_value() { # $1 = Feldname; liest den Kopf des Plans, nicht das ganze Dokument
  head -n 20 "$PLAN" | sed -n "s/.*$1: *//p" | head -1 | sed -e 's/ *·.*$//' -e 's/ *(.*$//' -e 's/ *$//'
}

marker_of() { # $1 = Paketnummer -> die Marke dieses Pakets, oder leer
  sed -En "s/^### \[(.)\] $1\..*/\1/p" "$PLAN" | head -1
}

first_with_marker() { # $1 = Markenzeichen -> die erste Paketnummer damit, oder leer
  sed -En "s/^### \[$1\] ([0-9]+[a-z]?)\..*/\1/p" "$PLAN" | head -1
}

count_with_marker() { # $1 = Markenzeichen
  sed -En "s/^### \[$1\] ([0-9]+[a-z]?)\..*/\1/p" "$PLAN" | wc -l | tr -d ' '
}

effort_for_package() { # $1 = Paketnummer -> die Zeile »- Effort:« aus dem Detailplan
  local v
  v=$(sed -n "/^### \[.\] $1\./,/^### /p" "$PLAN" | sed -n 's/^- Effort: *\([a-z]*\).*/\1/p' | head -1)
  case "$v" in
    low|medium|high|xhigh|max) printf '%s' "$v" ;;
    *) printf '%s' "$EFFORT_B" ;;
  esac
}

dirty_paths() { # Arbeitsbaum ohne den Plan, der während des Laufs ungetrackt bleibt
  git status --porcelain | grep -v -F -e "$(basename "$PLAN")" || true
}

# --- Vorbedingungen ---------------------------------------------------------

preflight() {
  local t
  for t in claude jq git sed grep awk; do
    command -v "$t" >/dev/null 2>&1 || die $EX_PRE "$t nicht gefunden"
  done

  git rev-parse --is-inside-work-tree >/dev/null 2>&1 \
    || die $EX_PRE "kein git-Arbeitsbaum: $(pwd)"
  [ -f "$PLAN" ] || die $EX_PRE "kein Plan gefunden: $PLAN — Schritt 1-5 der SKILL.md laufen vor diesem Skript"
  [ -f "$SCHEMA" ] || die $EX_PRE "Rückgabeschema fehlt: $SCHEMA"

  BRANCH=$(head_value 'Branch')
  [ -n "$BRANCH" ] || die $EX_PRE "der Kopf des Plans nennt keinen Branch"
  local current
  current=$(git branch --show-current)
  [ "$current" = "$BRANCH" ] || die $EX_PRE \
    "der Plan gehört zu Branch '$BRANCH', ausgecheckt ist '$current'. Der Nutzer entscheidet, bevor irgendetwas läuft."

  WORK=$(head_value 'Arbeitsverzeichnis')
  [ -n "$WORK" ] || WORK=${ARBEITSDIR:-.git/remediation}
  mkdir -p "$WORK" || die $EX_PRE "Arbeitsverzeichnis nicht anlegbar: $WORK"
  WORK=$(cd -- "$WORK" && pwd)

  local d
  d=$(dirty_paths)
  [ -z "$d" ] || die $EX_PRE "$(printf 'Arbeitsbaum nicht sauber. Fremde Änderungen dürfen nicht in Paket-Commits geraten:\n%s' "$d")"

  # Zwei Schleifen auf einem Arbeitsbaum ist genau der Konflikt, den die
  # Sequenzialität vermeiden soll.
  if [ "$DRY" = 0 ] && ! mkdir "$WORK/.remediate.lock" 2>/dev/null; then
    die $EX_PRE "hier läuft schon eine Schleife ($WORK/.remediate.lock). Läuft keine mehr, das Verzeichnis von Hand entfernen."
  fi
  if [ "$DRY" = 0 ]; then
    trap 'rmdir "$WORK/.remediate.lock" 2>/dev/null || true' EXIT
  fi

  [ "$(count_with_marker '.')" != "0" ] || die $EX_PRE "der Plan enthält kein einziges Paket"
}

# --- Der Brief --------------------------------------------------------------

brief_for() { # $1 = Rolle, $2 = Paketnummer
  local role=$1 pkg=$2 scope

  case "$role" in
    A) scope="Du bist A: du führst Zug 0 aus — Abgleich, Triage der offenen Befunde, Detailplan, Restplan prüfen. Danach hörst du auf. Du änderst keine Zeile Projektcode und startest keinen Implementierer." ;;
    B) scope="Du bist B: Zug 0 ist erledigt, dein Detailplan steht im Plan unter deinem Paket. Du beginnst bei Zug 1 und endest mit dem Commit aus Zug 5. Du machst Zug 0 nicht noch einmal." ;;
  esac

  cat <<EOF
Du bist Runner $role für Paket $pkg eines Remediation-Laufs.

Lies zuerst diese beiden Dateien, in dieser Reihenfolge:
  1. $SKILL_DIR/references/shell-runner.md — deine Rolle, deine Grenzen, deine Rückgabe
  2. $SKILL_DIR/references/runner.md — der Inhalt deiner Züge

Plan: $PLAN
Branch: $BRANCH
Arbeitsverzeichnis für Diffs und Logs: $WORK

$scope

Deine Rückgabe ist ein JSON-Objekt nach dem Schema, das dir mitgegeben wurde, und
sie ist der einzige Kanal zwischen uns. Niemand fragt dich nach deinem Stand, und
es gibt keine Adresse, an die du etwas anderes schicken könntest. Was den Lauf
überleben muss, schreibst du nach $PLAN, bevor du zurückgibst.
EOF
}

# --- Ein Runner -------------------------------------------------------------

dispatch() { # $1 = Rolle, $2 = Paketnummer; setzt RES und RAW
  local role=$1 pkg=$2 model effort brief rc cost denials

  case "$role" in
    A) model=$MODEL_A; effort=$EFFORT_A ;;
    B) model=$MODEL_B; effort=$(effort_for_package "$pkg") ;;
    *) die $EX_PRE "unbekannte Rolle: $role" ;;
  esac

  brief=$(brief_for "$role" "$pkg")

  if [ "$DRY" = 1 ]; then
    say "--- Runner $role · Paket $pkg · $model/$effort · Budget \$$BUDGET_USD"
    printf '%s\n\n' "$brief"
    RES=''; RAW=''
    return 0
  fi

  RAW="$WORK/paket-$pkg.$role.json"
  say "→ Runner $role · Paket $pkg · $model/$effort"

  rc=0
  claude -p "$brief" \
    --model "$model" \
    --effort "$effort" \
    --session-id "$(uuid)" \
    --output-format json \
    --json-schema "$SCHEMA" \
    --permission-mode "$PERM" \
    --max-budget-usd "$BUDGET_USD" \
    > "$RAW" 2> "$WORK/paket-$pkg.$role.stderr" || rc=$?

  [ "$rc" -eq 0 ] || die $EX_AGENT "Runner $role für Paket $pkg endete mit Exit $rc — siehe $RAW und $WORK/paket-$pkg.$role.stderr"

  jq -e '.is_error == false' "$RAW" >/dev/null 2>&1 \
    || die $EX_AGENT "Runner $role für Paket $pkg meldet is_error — siehe $RAW"

  cost=$(jq -r '.total_cost_usd // 0' "$RAW")
  TOTAL_COST=$(awk -v a="$TOTAL_COST" -v b="$cost" 'BEGIN { printf "%.4f", a + b }')

  denials=$(jq -r '(.permission_denials // []) | length' "$RAW")
  [ "$denials" = "0" ] || die $EX_PERM \
    "Runner $role für Paket $pkg wurde $denials mal von der Rechteschranke gestoppt. Die Allowlist ist zu eng, nicht das Paket zu schwer — siehe $RAW."

  # Die Form garantiert das Schema; leer heißt, dass sie es trotzdem nicht tut.
  RES=$(jq -c 'try (if (.result | type) == "string" then (.result | fromjson) else .result end) catch empty' "$RAW")
  [ -n "$RES" ] || die $EX_CONTRACT "Rückgabe von Runner $role für Paket $pkg ist kein JSON nach dem Schema — siehe $RAW"

  local got
  got=$(jq -r '.package' <<<"$RES")
  [ "$got" = "$pkg" ] || die $EX_CONTRACT "Runner $role sollte Paket $pkg bearbeiten, gibt aber Paket $got zurück"
}

field() { jq -r "(.$1 // \"\")" <<<"$RES"; }

# --- Vorlegen und anhalten --------------------------------------------------

hand_over() { # $1 = Rolle, $2 = Paketnummer, $3 = Status
  say ""
  say "Paket $2 · Runner $1 · $3"
  say "$(field for_you)"
  journal "paket=$2 rolle=$1 status=$3 -> Nutzer"
  say ""
  say "Die Schleife hält an. Antwort datiert in »Entscheidungen« im Plan eintragen,"
  say "dann dieses Skript erneut starten."
  exit $EX_ASK
}

# --- Die Gegenproben --------------------------------------------------------

check_marker() { # $1 = Paketnummer, $2 = erwartete Marke
  local m
  m=$(marker_of "$1")
  [ "$m" = "$2" ] || die $EX_CONTRACT \
    "Paket $1 müsste im Plan auf [$2] stehen, steht aber auf [${m:-nichts}]. Der Plan trägt den Stand, nicht die Rückgabe."
}

check_commit() { # $1 = Paketnummer, $2 = HEAD vor dem Runner
  local hash vlog head_now
  hash=$(field hash)
  [ -n "$hash" ] || die $EX_CONTRACT "Paket $1 meldet 'committed' ohne Hash"

  git rev-parse --verify --quiet "$hash^{commit}" >/dev/null \
    || die $EX_CONTRACT "Paket $1 nennt den Hash $hash, den es in diesem Repo nicht gibt"

  head_now=$(git rev-parse HEAD)
  [ "$head_now" != "$2" ] || die $EX_CONTRACT "Paket $1 meldet 'committed', aber HEAD steht unverändert auf $2"
  [ "$(git rev-parse "$hash")" = "$head_now" ] \
    || die $EX_CONTRACT "Paket $1 nennt $hash, HEAD ist aber $(git rev-parse --short HEAD)"

  vlog=$(field verify_log)
  case "$vlog" in
    "$WORK"/*) ;;
    *) die $EX_CONTRACT "Paket $1 nennt ein Verify-Log außerhalb des Arbeitsverzeichnisses: ${vlog:-nichts}" ;;
  esac
  [ -f "$vlog" ] || die $EX_CONTRACT "Paket $1 nennt ein Verify-Log, das nicht existiert: $vlog"
  grep -q '^exit=0$' "$vlog" \
    || die $EX_CONTRACT "in $vlog steht keine Zeile 'exit=0'. Committet wird nur ein grüner Lauf, und belegt wird er dort."

  # Wer committet, hat delegiert: Implementierer und Reviewer sind je ein
  # Subagent. Das ist gezählt worden, nicht behauptet.
  local spawned
  spawned=$(jq -r '(.subagent_stats.spawned // "-")' "$RAW")
  if [ "$spawned" = "-" ]; then
    warn "diese CLI meldet keine subagent_stats — die Delegationsprüfung entfällt für Paket $1"
  elif [ "$spawned" -lt 2 ]; then
    die $EX_CONTRACT "Paket $1 wurde mit $spawned Subagenten committet. Implementierer und Reviewer sind zwei, und ein Runner schreibt keinen Projektcode selbst."
  fi

  local left
  left=$(dirty_paths)
  [ -z "$left" ] || warn "$(printf 'nach Paket %s liegt noch etwas im Arbeitsbaum:\n%s' "$1" "$left")"
}

# --- Die Schleife -----------------------------------------------------------

run_a() { # $1 = Paketnummer
  local status
  dispatch A "$1"
  status=$(field status)
  case "$status" in
    planned)
      check_marker "$1" '~'
      say "  Detailplan steht · $(field plan_changes)"
      journal "paket=$1 rolle=A status=planned plan=$(field plan_changes) queue=$(field queue)"
      ;;
    dropped)
      check_marker "$1" 'x'
      say "  entfallen · $(field findings)"
      PACKAGES_DONE=$((PACKAGES_DONE + 1))
      journal "paket=$1 rolle=A status=dropped"
      ;;
    question|blocked)
      hand_over A "$1" "$status"
      ;;
    *)
      die $EX_CONTRACT "Runner A für Paket $1 gibt Status '$status' zurück, den es für A nicht gibt"
      ;;
  esac
}

run_b() { # $1 = Paketnummer
  local status head_before
  head_before=$(git rev-parse HEAD)
  dispatch B "$1"
  status=$(field status)
  case "$status" in
    committed)
      check_marker "$1" 'x'
      check_commit "$1" "$head_before"
      PACKAGES_DONE=$((PACKAGES_DONE + 1))
      say "  $(git rev-parse --short HEAD) · $(field findings) · $(field rounds) Runde(n)"
      [ "$(field queue)" = "-" ] || say "  Queue: $(field queue)"
      journal "paket=$1 rolle=B status=committed hash=$(field hash) runden=$(field rounds)"
      ;;
    dropped)
      check_marker "$1" 'x'
      say "  entfallen · $(field findings)"
      PACKAGES_DONE=$((PACKAGES_DONE + 1))
      journal "paket=$1 rolle=B status=dropped"
      ;;
    question|blocked)
      # Bei blocked steht das Paket auf [!] und die Schleife könnte weiterlaufen.
      # Sie tut es nicht: ob spätere Pakete darauf aufbauen, entscheidet der
      # Nutzer, und dafür hat er den Plan vor sich.
      if [ "$status" = "blocked" ]; then check_marker "$1" '!'; fi
      hand_over B "$1" "$status"
      ;;
    *)
      die $EX_CONTRACT "Runner B für Paket $1 gibt Status '$status' zurück, den es für B nicht gibt"
      ;;
  esac
}

main() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --once) ONCE=1 ;;
      --dry-run) DRY=1 ;;
      --help|-h) usage; exit 0 ;;
      *) die $EX_PRE "unbekannte Option: $1" ;;
    esac
    shift
  done

  preflight

  say "Plan:      $PLAN"
  say "Branch:    $BRANCH"
  say "Arbeit:    $WORK"
  say "Pakete:    $(count_with_marker ' ') offen · $(count_with_marker 'x') erledigt · $(count_with_marker '!') blockiert"
  say ""

  local pkg
  if [ "$DRY" = 1 ]; then
    pkg=$(first_with_marker '~')
    if [ -z "$pkg" ]; then pkg=$(first_with_marker ' '); fi
    [ -n "$pkg" ] || die $EX_PRE "kein offenes Paket im Plan"
    dispatch A "$pkg"
    dispatch B "$pkg"
    say "--dry-run: nichts gestartet, nichts geändert."
    exit $EX_OK
  fi

  local iter=0 planned open
  while :; do
    iter=$((iter + 1))
    [ "$iter" -le "$MAX_ITER" ] || die $EX_CONTRACT "$MAX_ITER Durchläufe ohne Ende. Die Schleife kommt nicht voran, und das ist kein Fall für einen weiteren Versuch."

    planned=$(first_with_marker '~')
    open=$(first_with_marker ' ')

    if [ -n "$planned" ]; then
      if [ "$iter" = "1" ]; then
        say "Paket $planned steht auf [~]: ein früherer Lauf ist mitten im Paket gestorben."
        say "references/resume.md gilt, nicht dieses Skript. Der Nutzer entscheidet über den Arbeitsbaum."
        exit $EX_RESUME
      fi
      run_b "$planned"
    elif [ -n "$open" ]; then
      run_a "$open"
    else
      break
    fi

    if [ "$ONCE" = "1" ]; then
      say ""
      say "--once: nach einem Runner angehalten. Kosten bisher: \$$TOTAL_COST"
      exit $EX_OK
    fi
  done

  local blocked
  blocked=$(count_with_marker '!')
  say ""
  say "Kein Paket mehr offen. $PACKAGES_DONE erledigt, $blocked blockiert, \$$TOTAL_COST."
  [ "$blocked" = "0" ] || say "Blockiert: $(sed -En 's/^### \[!\] ([0-9]+[a-z]?)\..*/\1/p' "$PLAN" | tr '\n' ' ')"
  say "Der Abschluss folgt: Schritt 7 der SKILL.md, mit references/semver-and-closeout.md."
  exit $EX_OK
}

main "$@"
