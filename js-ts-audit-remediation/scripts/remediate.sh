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
EX_BUSY=31     # die API blieb überlastet, nichts ist kaputt, später erneut starten
EX_PRE=40      # eine Vorbedingung stimmt nicht

# --- Stellschrauben, alle über die Umgebung überschreibbar ------------------
PLAN=${PLAN:-./remediation-plan.md}

# Zug 0 läuft immer in einem eigenen Fenster der tmux-Session: der Planer hat
# deine Werkzeuge, deine MCP-Server und kann dich fragen. Ein Planer, der das
# nicht kann, plant gegen einen Code-Stand, den er nur zur Hälfte versteht.
MODEL_A=${MODEL_A:-opus}        # Zug 0: Abgleich, Triage, Detailplan
EFFORT_A=${EFFORT_A:-xhigh}
MODEL_B=${MODEL_B:-opus}        # Zug 1-5: beauftragen, prüfen, verifizieren, committen
EFFORT_B=${EFFORT_B:-medium}   # nur der Vorgabewert; »- Effort:« im Detailplan schlägt ihn
PERM=${PERM:-acceptEdits}
BUDGET_USD=${BUDGET_USD:-15}    # harte Obergrenze je Runner-Prozess
MAX_ITER=${MAX_ITER:-200}       # Reißleine gegen eine Schleife ohne Fortschritt
MAX_ROUNDS=${MAX_ROUNDS:-5}     # Obergrenze der Fehlerkette je Paket
ATTEMPTS=${ATTEMPTS:-3}         # Versuche je Runner, wenn die API überlastet ist
BACKOFF=${BACKOFF:-60,300,900}  # Wartezeiten dazwischen, in Sekunden
FALLBACK_MODEL=${FALLBACK_MODEL:-}  # leer lassen: lieber warten als still schwächer werden

# Was ein Runner braucht. --permission-mode acceptEdits deckt Dateiänderungen
# ab, Bash aber nicht: ohne diese Zeile wird »git add« abgefragt, und ein
# Prozess ohne Terminal kann nicht antworten.
#
# Es steht »Bash« da und keine Liste von Präfixen. Gemessen: ein Muster wie
# Bash(claude *) greift an dem, was ein Runner wirklich absetzt, nicht mehr —
# »claude -p "$(cat brief)" > report.json« wird abgelehnt, und der Runner fällt
# auf Subagenten zurück, also genau auf das, wogegen der Prozess-Umbau gebaut
# ist. Die Grenze zieht die Verbotsliste unten, nicht diese Zeile.
ALLOW_TOOLS=${ALLOW_TOOLS:-Bash}

# Was ein Runner nicht bekommt, und zwar nur zweierlei. Erstens Werkzeuge, mit
# denen ein Prozess auf eine Antwort warten oder sich selbst überleben kann:
# beides bräche die Zusage, dass ein beendeter Prozess ein fertiges Paket
# bedeutet. Zweitens die Kommandos, die der Lauf laut SKILL.md ohnehin nicht
# kennt — kein Push, kein Tag, kein Publish.
#
# Alles andere bleibt: was auf dieser Maschine eingestellt ist, steht dem Runner
# und seinen Subagenten offen. DENY_TOOLS="" schaltet auch diesen Rest ab.
DENY_TOOLS=${DENY_TOOLS:-AskUserQuestion,SendMessage,ScheduleWakeup,CronCreate,Bash(git push*),Bash(git tag*),Bash(npm publish*),Bash(pnpm publish*),Bash(yarn publish*)}

# Was sonst noch an jeden Runner durchgereicht werden soll, an Kommas getrennt:
# --mcp-config <datei>, --add-dir <pfad>, --plugin-dir <pfad>. Braucht ein Paket
# einen MCP-Server, ist das der Ort dafür.
EXTRA_ARGS=${EXTRA_ARGS:-}

# Zug 0 läuft in einem eigenen tmux-Fenster und meldet sein Ende über eine
# Datei, nicht über einen Menschen an der Tastatur. Diese Werte sagen, wie
# geduldig die Schleife dabei ist. ZUG0_GRACE ist die Gnadenfrist zwischen dem
# Feierabendzeichen und dem Schließen des Fensters; wer in dieser Zeit noch
# etwas hineinschreibt, redet gegen eine Uhr.
#
# ZUG0_TIMEOUT ist die Obergrenze für einen ganzen Zug 0 und stand lange auf 0,
# also auf »warten, solange es dauert«. Das war richtig gedacht und in der Praxis
# falsch: ein Lauf, den niemand beaufsichtigt, stand damit bis ans Ende aller
# Tage, und von außen sah das aus wie Arbeit. Deshalb jetzt eine endliche Zahl —
# und eine Uhr, die stillsteht, solange der Nutzer erreichbar ist: ein Client am
# Fenster, oder ein offener Remote-Control-Kanal, über den ihn die Frage auch
# unterwegs erreicht. Wer erreichbar ist, wird nie abgeschnitten und braucht so
# lange, wie er braucht; wer es auf keinem Weg ist, bekommt einen sauberen
# Abbruch statt eines Hängers. Die Frist richtet sich also gegen den blinden
# Lauf, nicht gegen den langsamen Menschen. 0 nimmt auch sie weg.
ZUG0_POLL=${ZUG0_POLL:-5}           # Sekunden zwischen zwei Blicken auf die Datei
ZUG0_GRACE=${ZUG0_GRACE:-20}        # Gnadenfrist, bevor das Fenster zugeht
ZUG0_CLOSE=${ZUG0_CLOSE:-20}        # wie lange /exit Zeit bekommt, bevor kill-window folgt
ZUG0_TIMEOUT=${ZUG0_TIMEOUT:-1800}  # Obergrenze für einen unbeaufsichtigten Zug 0, 0 = keine
# Der Vertrauensdialog der CLI (»Is this a project you trust?«) erscheint in
# jedem Verzeichnis, das sie noch nie gesehen hat. Er entfällt in -p, trifft also
# nur Zug 0, und keine Flagge nimmt ihn weg. Steht er länger als diese Frist,
# bricht die Schleife ab und sagt, was zu tun ist — sonst wartet sie auf eine
# Taste, die niemand drückt.
ZUG0_TRUST_GRACE=${ZUG0_TRUST_GRACE:-60}
# »Es hing ein Client an der Session« war einmal der einzige Beleg dafür, dass
# ein Mensch da war. Er ist es nicht mehr: Zug 0 startet mit --remote-control,
# und der Nutzer beantwortet die Frage ausdrücklich auch vom Handy. Wer das tut,
# hängt an keinem tmux-Client — list-clients sieht ihn nie und erklärte seine
# Antwort zur Erfindung. Deshalb zählt der offene Remote-Control-Kanal als
# zweiter Beleg (rc_offen). Bleibt der dritte Weg: wer von außen per send-keys
# antwortet (Szenario-Tests tun das), erzeugt weder Client noch Kanal. Für ihn
# gibt es diese Tür, und sie ist ausdrücklich zu öffnen: ZUG0_ASSUME_USER=1 sagt
# »ich beantworte von außen«. Ein unbeaufsichtigter Lauf setzt das nicht.
ZUG0_ASSUME_USER=${ZUG0_ASSUME_USER:-0}

ONCE=0
DRY=0
# 1, sobald wir der Prozess in der tmux-Session sind. Setzt launch_tmux.
INSIDE=0; [ -n "${REMEDIATE_INSIDE:-}" ] && INSIDE=1
SESSION=${SESSION:-}            # Name der tmux-Session
TMUX_BIN=${TMUX_BIN:-tmux}      # falls tmux woanders liegt

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
SKILL_DIR=$(cd -- "$SCRIPT_DIR/.." && pwd)
SCHEMA="$SKILL_DIR/assets/runner-return.schema.json"

TOTAL_COST=0
PACKAGES_DONE=0
RES=""   # die geprüfte Rückgabe des zuletzt gelaufenen Runners
RAW=""   # der Pfad zu seinem vollständigen Ergebnis-JSON
ERR=""   # der Pfad zu seiner Standardfehlerausgabe

# --- Ausgabe ----------------------------------------------------------------

say()  { printf '%s\n' "$*"; }
warn() { printf 'WARNUNG: %s\n' "$*" >&2; }

die() { # $1 = Exit-Code, Rest = Meldung
  local code=$1; shift
  printf 'ABBRUCH (%s): %s\n' "$code" "$*" >&2
  exit "$code"
}

entscheidungen() { # der Abschnitt »Entscheidungen« aus dem Plan, roh
  sed -n '/^## Entscheidungen/,/^## /p' "$PLAN" 2>/dev/null
}

# Der zweite Antwortweg, den dieses Skript selbst öffnet: Remote Control macht
# die Session vom Account aus erreichbar, und der Nutzer antwortet vom Browser
# oder vom Handy. Ein solcher Nutzer taucht in list-clients nicht auf. Die CLI
# schreibt aber beim Verbinden eine feste Zeile ins Fenster — »/remote-control
# is active · Continue here, on your phone, or at https://claude.ai/code/…« —,
# und die ist der Beleg. Gesucht wird tolerant: das Terminal rendert die Zeile
# je nach Umbruch auch ohne die Leerzeichen darin.
#
# Gesucht wird an zwei Orten, und der zweite ist kein Luxus. pipe-pane lässt
# sich erst einschalten, wenn das Fenster schon läuft; was der Prozess in
# dieser Lücke schreibt, steht in keiner Mitschrift. Gemessen an einem Stub,
# der sofort schreibt: die ersten beiden Zeilen fehlten, und mit ihnen der
# Beleg — ein Nutzer, der geantwortet hat, wäre als Erfinder dagestanden. Die
# echte CLI meldet den Kanal erst nach ihrem Handshake und fällt selten in
# diese Lücke, aber »selten« ist hier zu wenig. Der Scrollback des Fensters
# kennt auch, was vor pipe-pane geschah; er lebt nur so lange wie das Fenster,
# und genau dort wird gefragt.
rc_offen() { # $1 = Paketnummer, $2 = tmux-Fenster; wahr, sobald der Kanal stand
  grep -Eqa 'remote-control *is *active' "$WORK/paket-$1.zug0.pane.log" 2>/dev/null \
    && return 0
  "$TMUX_BIN" capture-pane -p -S - -t "$2" 2>/dev/null \
    | grep -Eqa 'remote-control *is *active'
}

journal() { # eine Zeile je Paket, damit ein Lauf nachvollziehbar bleibt
  [ -n "${WORK:-}" ] || return 0
  printf '%s\t%s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*" >> "$WORK/remediate.log"
}

usage() {
  sed -n '3,17p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
  cat <<'EOF'

Optionen:
  --once      nach dem ersten Paket anhalten. Für den ersten Probelauf.
  --dry-run   im Vordergrund zeigen, was beauftragt würde. Startet nichts.
  --help      diese Ausgabe.

Umgebung:
  PLAN MODEL_A EFFORT_A MODEL_B EFFORT_B PERM BUDGET_USD MAX_ITER MAX_ROUNDS
  ATTEMPTS BACKOFF FALLBACK_MODEL ALLOW_TOOLS DENY_TOOLS EXTRA_ARGS
  SESSION TMUX_BIN ZUG0_POLL ZUG0_GRACE ZUG0_CLOSE ZUG0_TIMEOUT ZUG0_TRUST_GRACE ZUG0_ASSUME_USER
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

tool_args() { # füllt TOOL_ARGS; die Muster enthalten Leerzeichen und dürfen
              # deshalb nicht als ein Komma-String durchgereicht werden
  local t old=$IFS
  TOOL_ARGS=()
  # Der Brief schickt jeden Runner in zwei Dateien unter $SKILL_DIR. Ohne diese
  # Zeile liegen sie außerhalb seines Arbeitsverzeichnisses, und er scheitert an
  # der Rechteschranke, bevor er weiß, was seine Rolle ist.
  TOOL_ARGS[${#TOOL_ARGS[@]}]=--add-dir
  TOOL_ARGS[${#TOOL_ARGS[@]}]=$SKILL_DIR
  # Und das Arbeitsverzeichnis: es liegt außerhalb der Versionierung und damit
  # in der Regel außerhalb des Projekts. Ohne diese Zeile weicht ein Runner in
  # den Arbeitsbaum aus, und die Diffs landen dort, wo sie nicht hingehören.
  TOOL_ARGS[${#TOOL_ARGS[@]}]=--add-dir
  TOOL_ARGS[${#TOOL_ARGS[@]}]=$WORK
  if [ -n "$ALLOW_TOOLS" ]; then
    TOOL_ARGS[${#TOOL_ARGS[@]}]=--allowedTools
    IFS=','; for t in $ALLOW_TOOLS; do TOOL_ARGS[${#TOOL_ARGS[@]}]=$t; done; IFS=$old
  fi
  if [ -n "$DENY_TOOLS" ]; then
    TOOL_ARGS[${#TOOL_ARGS[@]}]=--disallowedTools
    IFS=','; for t in $DENY_TOOLS; do TOOL_ARGS[${#TOOL_ARGS[@]}]=$t; done; IFS=$old
  fi
  if [ -n "$EXTRA_ARGS" ]; then
    IFS=','; for t in $EXTRA_ARGS; do TOOL_ARGS[${#TOOL_ARGS[@]}]=$t; done; IFS=$old
  fi
}

tool_args_zug0() { # $1 = Paketnummer. Für Zug 0 im Fenster: nichts entziehen und
  local t old=$IFS                                  # nur eine einzige Sache erlauben
  TOOL_ARGS=()
  TOOL_ARGS[${#TOOL_ARGS[@]}]=--add-dir             # seine beiden Referenzdateien
  TOOL_ARGS[${#TOOL_ARGS[@]}]=$SKILL_DIR
  TOOL_ARGS[${#TOOL_ARGS[@]}]=--add-dir             # und das Arbeitsverzeichnis
  TOOL_ARGS[${#TOOL_ARGS[@]}]=$WORK
  # Das Feierabendzeichen ist ein Bash-Aufruf, und Zug 0 bekommt sonst keine
  # Allowlist: die Rechte sind die des Nutzers, das ist seine Session. Genau
  # dieser eine Aufruf ist aber nicht seine Idee, sondern die Forderung dieses
  # Skripts — und er kommt als Letztes, wenn der Nutzer seine Fragen längst
  # beantwortet hat und nicht mehr hinsieht. Ohne die Zeile stünde dort ein
  # Freigabe-Dialog, und der Lauf hinge wieder an einem Menschen, nur eine
  # Handlung später als vorher. Gemessen ohne diese Zeile: fünf Bash-Aufrufe
  # eines Planers, fünf Ablehnungen.
  #
  # Das Muster nennt genau ein Kommando, wirkt aber breiter, als es aussieht:
  # gemessen an einem -p-Prozess schaltet *irgendein* Bash-Muster in der
  # Allowlist Bash insgesamt frei — »echo« lief mit, obwohl nur der touch
  # gelistet war. Für die TUI ist das nicht nachgemessen. Wer Zug 0 strikt auf
  # die Rechte des Nutzers festnageln will, muss diese Zeile also wieder
  # herausnehmen und den Freigabe-Dialog in Kauf nehmen.
  TOOL_ARGS[${#TOOL_ARGS[@]}]=--allowedTools
  TOOL_ARGS[${#TOOL_ARGS[@]}]="Bash(touch $WORK/paket-$1.zug0.done)"
  if [ -n "$EXTRA_ARGS" ]; then
    IFS=','; for t in $EXTRA_ARGS; do TOOL_ARGS[${#TOOL_ARGS[@]}]=$t; done; IFS=$old
  fi
}

snapshot() { # alles, was ein Runner bleibend verändern könnte, in einer Zeile
  printf '%s|%s|%s' \
    "$(git rev-parse HEAD)" \
    "$(git status --porcelain | cksum)" \
    "$(cksum < "$PLAN")"
}

nth_backoff() { # $1 = Versuchsnummer -> Wartezeit in Sekunden
  printf '%s' "$BACKOFF" | tr ',' '\n' | sed -n "$1p" | tr -d ' '
}

transient_failure() { # 0 = die API war überlastet, ein späterer Versuch lohnt
  # Erstens das strukturierte Signal. Wenn es da ist, entscheidet es allein:
  # ein erschöpftes Budget und eine abgelehnte Anfrage sehen im Text ähnlich
  # aus wie eine Überlastung, und nur eine davon wird durch Warten besser.
  if [ -s "$RAW" ] && jq -e . "$RAW" >/dev/null 2>&1; then
    case "$(jq -r '(.api_error_status // "")' "$RAW")" in
      429|500|502|503|529) return 0 ;;
      *) return 1 ;;
    esac
  fi

  # Zweitens, und nur wenn der Prozess gar kein lesbares JSON hinterlassen hat:
  # der Text, den er ins Leere geschrieben hat. Dieselben fünf Codes wie oben —
  # eine kürzere Liste hier hieße, dass ein 500 je nach Sterbezeitpunkt des
  # Prozesses mal wiederholt wird und mal nicht. Die Ziffern müssen allein
  # stehen, sonst springt das Muster auf jede Zahl an, die zufällig so aussieht.
  grep -qE '(^|[^0-9])(429|500|502|503|529)([^0-9]|$)|overloaded_error|Overloaded|rate.?limit' "$ERR" 2>/dev/null
}

dirty_paths() { # Arbeitsbaum ohne den Plan, der während des Laufs ungetrackt bleibt
  git status --porcelain | grep -v -F -e "$(basename "$PLAN")" || true
}

# --- Start in einer abgelösten tmux-Session ---------------------------------

launch_tmux() { # $@ = die Argumente, mit denen der Lauf drinnen starten soll
  local cmd v log
  command -v "$TMUX_BIN" >/dev/null 2>&1 || die $EX_PRE \
    "$(printf '%s\n%s' \
      'tmux wird gebraucht und ist nicht da. Der Lauf hängt sich in eine abgelöste' \
      'tmux-Session, weil nur die ein Terminal hat, in dem Zug 0 dich fragen kann.')"

  if "$TMUX_BIN" has-session -t "$SESSION" 2>/dev/null; then
    die $EX_PRE "$(printf 'Es läuft schon eine Session »%s«.\n  tmux attach -t %s   ansehen\n  tmux kill-session -t %s   beenden' "$SESSION" "$SESSION" "$SESSION")"
  fi

  # Die Umgebung wandert ausdrücklich mit. Ein tmux-Server, der schon läuft,
  # hat seine eigene, und die kennt keine dieser Stellschrauben.
  cmd="env"
  cmd="$cmd REMEDIATE_INSIDE=1"
  for v in PLAN SESSION MODEL_A EFFORT_A MODEL_B EFFORT_B PERM BUDGET_USD \
           MAX_ITER MAX_ROUNDS ATTEMPTS BACKOFF FALLBACK_MODEL ALLOW_TOOLS \
           DENY_TOOLS EXTRA_ARGS ZUG0_POLL ZUG0_GRACE ZUG0_CLOSE ZUG0_TIMEOUT \
           ZUG0_TRUST_GRACE ZUG0_ASSUME_USER; do
    eval "[ -n \"\${$v:-}\" ]" && cmd="$cmd $v=$(eval printf '%q' "\"\$$v\"")"
  done
  cmd="$cmd $(printf '%q' "$SCRIPT_DIR/$(basename "${BASH_SOURCE[0]}")")"
  for v in "$@"; do cmd="$cmd $(printf '%q' "$v")"; done

  log="$WORK/remediate.pane.log"
  "$TMUX_BIN" new-session -d -s "$SESSION" -c "$(pwd)" "$cmd" \
    || die $EX_PRE "tmux konnte die Session nicht anlegen"
  # Ohne das verschwindet die Ausgabe, sobald der Lauf endet.
  "$TMUX_BIN" set-option -t "$SESSION" -w remain-on-exit on >/dev/null 2>&1 || true
  "$TMUX_BIN" pipe-pane -o -t "$SESSION" "cat >> $(printf '%q' "$log")" >/dev/null 2>&1 || true

  say "Läuft in tmux-Session »$SESSION«."
  say ""
  printf '  %-38s %s\n' "tmux attach -t $SESSION"           "ansehen und antworten"
  printf '  %-38s %s\n' "Ctrl-b d"                          "wieder ablösen, der Lauf läuft weiter"
  printf '  %-38s %s\n' "tmux capture-pane -p -t $SESSION"  "hineinsehen, ohne anzuhängen"
  printf '  %-38s %s\n' "tmux kill-session -t $SESSION"     "abbrechen"
  say ""
  say "Mitschrift: $log"
  say "Journal:    $WORK/remediate.log"
  say ""
  say "Zug 0 macht dafür ein eigenes Fenster »p<N>-plan« auf, sobald das erste"
  say "Paket drankommt, und wartet dort auf dich. Schließen musst du es nicht:"
  say "wenn der Planer fertig ist, macht die Schleife es zu und läuft weiter."
  exit $EX_OK
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
  # --json-schema will das Schema selbst, nicht seinen Pfad. Ein Pfad kommt als
  # »not valid JSON« zurück, und zwar erst beim ersten Runner.
  SCHEMA_JSON=$(jq -c . "$SCHEMA" 2>/dev/null) \
    || die $EX_PRE "Rückgabeschema ist kein gültiges JSON: $SCHEMA"

  [ -n "$SESSION" ] || SESSION="remediate-$(basename "$(pwd)")"

  BRANCH=$(head_value 'Branch')
  [ -n "$BRANCH" ] || die $EX_PRE "der Kopf des Plans nennt keinen Branch"
  local current
  current=$(git branch --show-current)
  [ "$current" = "$BRANCH" ] || die $EX_PRE \
    "der Plan gehört zu Branch '$BRANCH', ausgecheckt ist '$current'. Der Nutzer entscheidet, bevor irgendetwas läuft."

  # Nicht unterhalb von .git/: dorthin lässt die CLI keinen Runner schreiben,
  # gemessen auch mit »Bash« in der Allowlist. Ein Lauf, dessen Runner ihre
  # Diffs und Verify-Logs nicht ablegen können, kommt nicht bis zum Commit.
  WORK=$(head_value 'Arbeitsverzeichnis')
  [ -n "$WORK" ] || WORK=${ARBEITSDIR:-${TMPDIR:-/tmp}/remediation-$(basename "$(pwd)")}
  mkdir -p "$WORK" || die $EX_PRE "Arbeitsverzeichnis nicht anlegbar: $WORK"
  WORK=$(cd -- "$WORK" && pwd)

  local d
  d=$(dirty_paths)
  [ -z "$d" ] || die $EX_PRE "$(printf 'Arbeitsbaum nicht sauber. Fremde Änderungen dürfen nicht in Paket-Commits geraten:\n%s' "$d")"

  # Zwei Schleifen auf einem Arbeitsbaum ist genau der Konflikt, den die
  # Sequenzialität vermeiden soll.
  if [ "$INSIDE" = 1 ] && ! mkdir "$WORK/.remediate.lock" 2>/dev/null; then
    die $EX_PRE "hier läuft schon eine Schleife ($WORK/.remediate.lock). Läuft keine mehr, das Verzeichnis von Hand entfernen."
  fi
  if [ "$INSIDE" = 1 ]; then
    trap 'ec=$?; journal "ende exit=$ec"; rmdir "$WORK/.remediate.lock" 2>/dev/null || true' EXIT
  fi

  if [ "$INSIDE" = 1 ] && { [ ! -t 0 ] || [ ! -t 1 ]; }; then
    die $EX_PRE "kein Terminal in der Session — dann gibt es auch kein Fenster, in dem Zug 0 fragen könnte. Das sollte nicht vorkommen."
  fi

  [ "$(count_with_marker '.')" != "0" ] || die $EX_PRE "der Plan enthält kein einziges Paket"
}

# --- Der Brief --------------------------------------------------------------

brief_for() { # $1 = Rolle, $2 = Paketnummer
  local role=$1 pkg=$2 scope rueckgabe

  # Der Rückkanal ist nicht derselbe. B gibt ein JSON-Objekt zurück, das die
  # Schleife prüft; A hat gar keins und hinterlässt seinen Stand im Plan.
  case "$role" in
    A) rueckgabe="Dein Ergebnis ist der Plan, nichts sonst: der Detailplan unter deinem Paket und die Marke davor. Du gibst kein JSON zurück, und niemand liest, was du am Ende in dieses Terminal schreibst. Was den Lauf überleben muss, steht in $PLAN, bevor du aufhörst.
Steht alles im Plan, tust du als allerletzte Handlung genau dies:
  touch $WORK/paket-$pkg.zug0.done
Das ist dein Feierabendzeichen, und es ist das Einzige, worauf die Schleife wartet. Sie schließt dieses Fenster ${ZUG0_GRACE} Sekunden später selbst und fährt fort; niemand muss dafür etwas tippen, und /exit brauchst du nicht. Vor dem touch sagst du dem Nutzer in einem Satz, dass du fertig bist und das Fenster gleich zugeht.
Die Reihenfolge ist keine Förmlichkeit: nach dem touch läuft eine Uhr, und was danach noch in deinem Kontext steht statt im Plan, ist verloren.
Der Nutzer ist erreichbar, am Fenster oder unterwegs — aber seine Aufmerksamkeit ist der teuerste Posten dieses Laufs, und du bist hier, damit er sie nicht braucht. Was sich begründen lässt, entscheidest du, und der Grund steht im Detailplan. Gefragt wird allein, was die Richtung umwirft; die Liste dafür ist »Wo du anhältst« in runner.md, und sie ist abschließend. Hast du eine Empfehlung, hast du entschieden." ;;
    B) rueckgabe="Deine Rückgabe ist ein JSON-Objekt nach dem Schema, das dir mitgegeben wurde, und
sie ist der einzige Kanal zwischen uns. Niemand fragt dich nach deinem Stand, und
es gibt keine Adresse, an die du etwas anderes schicken könntest. Was den Lauf
überleben muss, schreibst du nach $PLAN, bevor du zurückgibst." ;;
  esac

  case "$role" in
    A) scope="Du bist A: du führst Zug 0 aus — Abgleich, Triage der offenen Befunde, Detailplan, Restplan prüfen. Danach hörst du auf. Du änderst keine Zeile Projektcode und startest keinen Implementierer." ;;
    B) scope="Du bist B: Zug 0 ist erledigt, dein Detailplan steht im Plan unter deinem Paket. Du beginnst bei Zug 1 und endest mit dem Commit aus Zug 5. Du machst Zug 0 nicht noch einmal.
Die Fehlerkette in Zug 4 hat höchstens $MAX_ROUNDS Runden. Eine Runde, die die Zahl der offenen Befunde nicht senkt, ist die letzte — dann blockieren und berichten." ;;
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

$rueckgabe
EOF
}

# --- Ein Runner -------------------------------------------------------------

close_zug0_window() { # $1 = tmux-Fenster; erst höflich, dann bestimmt
  local win=$1 i=0
  # /exit ist der saubere Weg: die Session wird persistiert und lässt sich mit
  # »claude --resume« wieder aufmachen. Gemessen beendet das eine wartende TUI
  # zuverlässig. Es kann trotzdem danebengehen — ein Modell, das noch mitten im
  # Zug ist, schiebt die Zeile in seine Warteschlange —, und deshalb steht
  # dahinter kill-window. Die Zusage lautet: das Fenster geht zu.
  "$TMUX_BIN" send-keys -t "$win" '/exit' Enter >/dev/null 2>&1 || true
  while [ "$i" -lt "$ZUG0_CLOSE" ]; do
    "$TMUX_BIN" list-panes -t "$win" >/dev/null 2>&1 || return 0
    sleep 1; i=$((i + 1))
  done
  warn "Zug 0 ließ sich nicht mit /exit schließen — das Fenster wird beendet"
  "$TMUX_BIN" kill-window -t "$win" >/dev/null 2>&1 || true
}

dispatch_zug0() { # $1 = Paketnummer; Zug 0 in einem eigenen tmux-Fenster
  local pkg=$1 brief win wname done_file log_file brieffile starter a waited=0 trusted_wait=0 saw_client=0 ents_before
  brief=$(brief_for A "$pkg")
  tool_args_zug0 "$pkg"

  if [ "$DRY" = 1 ]; then
    say "--- Runner A · Paket $pkg · $MODEL_A/$EFFORT_A · eigenes tmux-Fenster"
    printf '%s\n\n' "$brief"
    return 0
  fi

  ents_before=$(entscheidungen)
  wname="p$pkg-plan"
  win="$SESSION:$wname"
  done_file="$WORK/paket-$pkg.zug0.done"
  log_file="$WORK/paket-$pkg.zug0.pane.log"
  brieffile="$WORK/paket-$pkg.zug0.brief.txt"
  starter="$WORK/paket-$pkg.zug0.sh"
  rm -f "$done_file"
  # pipe-pane hängt an, und die Mitschrift ist seit dem Remote-Control-Beleg
  # kein bloßes Protokoll mehr, sondern Beweismittel: stünde die Meldung eines
  # früheren Laufs noch darin, gälte der Kanal als offen, obwohl diesmal
  # niemand da ist. Ein Schritt Historie bleibt trotzdem erhalten — die
  # Abbruchmeldung des Vorlaufs verweist auf diese Datei, und wer sie danach
  # aufschlägt, soll nicht ins Leere greifen.
  [ -s "$log_file" ] && mv -f "$log_file" "$log_file.vorlauf"

  # Der Brief wandert über eine Datei und nicht über die Kommandozeile: tmux
  # startet ein Fenster über die Shell, und ein mehrzeiliger Text mit
  # Anführungszeichen überlebt diesen Weg nicht verlässlich. Nebenbei steht
  # danach auf der Platte, womit gestartet wurde.
  printf '%s\n' "$brief" > "$brieffile"
  { printf '#!/usr/bin/env bash\nexec claude "$(cat %q)"' "$brieffile"
    printf ' --model %q --effort %q --remote-control %q' \
      "$MODEL_A" "$EFFORT_A" "$SESSION-p$pkg-plan"
    for a in ${TOOL_ARGS[@]+"${TOOL_ARGS[@]}"}; do printf ' %q' "$a"; done
    printf '\n'
  } > "$starter"
  chmod +x "$starter"

  # Kein -p, kein Schema, keine Verbotsliste: das hier ist die Session des
  # Nutzers. Der Planer hat, was er eingestellt hat, und kann ihn fragen.
  # Remote Control macht sie vom Account aus erreichbar, unter ihrem Namen —
  # dieselbe Frage lässt sich dann auch vom Handy beantworten.
  "$TMUX_BIN" new-window -t "$SESSION" -n "$wname" -c "$(pwd)" "$starter" \
    || die $EX_PRE "tmux konnte das Fenster für Zug 0 nicht anlegen"
  # Ausdrücklich aus: steht die Option woanders an, bliebe das Fenster nach dem
  # Ende des Planers als toter Pane stehen, und die Schleife wartete auf ein
  # Verschwinden, das nie kommt. Die Mitschrift übernimmt das Nachsehen.
  "$TMUX_BIN" set-option -t "$win" -w remain-on-exit off >/dev/null 2>&1 || true
  "$TMUX_BIN" pipe-pane -o -t "$win" \
    "cat >> $(printf '%q' "$log_file")" >/dev/null 2>&1 || true

  say "→ Runner A · Paket $pkg · $MODEL_A/$EFFORT_A · tmux-Fenster »$wname«"
  say ""
  say "  Dort sitzt der Planer. Häng dich an und beantworte seine Fragen:"
  say "    tmux attach -t $SESSION"
  say "  Oder vom Handy: die Sitzung meldet sich unter deinem Account, sobald"
  say "  Remote Control steht. Beides zählt als Antwort."
  say "  Schließen musst du nichts. Wenn er fertig ist, hinterlegt er ein"
  say "  Zeichen, die Schleife macht das Fenster zu und läuft weiter."
  if [ "$ZUG0_TIMEOUT" -gt 0 ]; then
    say "  Solange du erreichbar bist — am Fenster oder über Remote Control —,"
    say "  wartet der Lauf, so lange du brauchst. Ist beides zu, hört er nach"
    say "  $((ZUG0_TIMEOUT / 60)) min von selbst auf, statt auf eine Antwort zu warten, die"
    say "  niemand geben kann. ZUG0_TIMEOUT=0 nimmt auch diese Frist weg."
  fi
  say ""

  while :; do
    if [ -e "$done_file" ]; then
      say "  Zug 0 ist fertig — das Fenster geht in ${ZUG0_GRACE}s zu."
      sleep "$ZUG0_GRACE"
      close_zug0_window "$win"
      break
    fi

    # Der Nutzer darf das Fenster weiterhin selbst verlassen. Dann steht kein
    # Zeichen da, und es gilt dasselbe wie sonst: die Marke entscheidet.
    if ! "$TMUX_BIN" list-windows -t "$SESSION" -F '#{window_name}' 2>/dev/null \
         | grep -qx "$wname"; then
      break
    fi

    # Der Vertrauensdialog steht vor allem anderen: der Planer hat zu diesem
    # Zeitpunkt nicht einmal seinen Brief gelesen. Ohne diese Probe wartet die
    # Schleife auf ein Feierabendzeichen von jemandem, der noch gar nicht
    # angefangen hat.
    if "$TMUX_BIN" capture-pane -p -t "$win" 2>/dev/null \
         | grep -qi 'trust this folder'; then
      trusted_wait=$((trusted_wait + ZUG0_POLL))
      if [ "$trusted_wait" -ge "$ZUG0_TRUST_GRACE" ]; then
        close_zug0_window "$win"
        journal "paket=$pkg rolle=A abgebrochen vertrauensdialog nach ${trusted_wait}s"
        die $EX_PRE "Zug 0 für Paket $pkg steht im Vertrauensdialog der CLI: sie kennt $(pwd) noch nicht. Öffne dort einmal »claude«, bestätige den Ordner, beende die Sitzung und starte den Lauf erneut."
      fi
    else
      trusted_wait=0
    fi

    sleep "$ZUG0_POLL"
    # Die Uhr läuft nur, wenn niemand zusieht. Ein angehängter Client heißt: der
    # Nutzer ist da und denkt nach, und Nachdenken ist kein Hänger.
    if "$TMUX_BIN" list-clients -t "$SESSION" -F '#{client_name}' 2>/dev/null \
         | grep -q .; then
      waited=0
      saw_client=1
    elif rc_offen "$pkg" "$win"; then
      # Der Kanal steht: die Frage erreicht den Nutzer, auch wenn niemand im
      # Fenster sitzt. Dann ist Warten kein Hänger, sondern Warten, und die Uhr
      # hat nichts zu suchen — sie war gegen den Lauf gerichtet, den niemand
      # beaufsichtigt, nicht gegen den, der auf eine Antwort wartet, die
      # kommen kann. Wer nicht mehr antworten will, beendet den Lauf selbst.
      waited=0
      saw_client=1
    else
      waited=$((waited + ZUG0_POLL))
    fi
    if [ "$ZUG0_TIMEOUT" -gt 0 ] && [ "$waited" -ge "$ZUG0_TIMEOUT" ]; then
      close_zug0_window "$win"
      journal "paket=$pkg rolle=A abgebrochen unbeaufsichtigt nach ${waited}s"
      die $EX_ASK "Zug 0 für Paket $pkg stand ${waited}s ohne jede Erreichbarkeit — kein Client am Fenster, kein offener Remote-Control-Kanal — und ohne Feierabendzeichen — vermutlich wartet er auf eine Antwort, die niemand gibt. Das Fenster ist zu, der Plan trägt, was der Planer geschrieben hat. Die Mitschrift liegt in $WORK/paket-$pkg.zug0.pane.log."
    fi
    [ $((waited % 600)) -ge "$ZUG0_POLL" ] || say "  … Zug 0 wartet seit $((waited / 60)) min, und niemand ist erreichbar"
  done

  # Eine Entscheidung des Nutzers setzt einen Nutzer voraus. War er während des
  # ganzen Zuges auf keinem der beiden Wege erreichbar — kein Client am Fenster,
  # kein offener Remote-Control-Kanal —, hat niemand etwas beantwortet, und
  # ein neuer Eintrag unter »Entscheidungen« ist dann keine Entscheidung, sondern
  # eine Erfindung. Gemessen: ein Planer, den niemand beantwortet hat, notierte
  # »Vorgabewert 30000 ms«, eine Zahl, die weder im Code noch im Audit steht.
  # Das wiegt schwerer als ein Hänger — die Zeile trägt ein Datum und wird von
  # jedem späteren Lauf als beschlossen behandelt.
  if [ "$saw_client" = 0 ] && [ "$ZUG0_ASSUME_USER" != 1 ] && [ "$(entscheidungen)" != "$ents_before" ]; then
    journal "paket=$pkg rolle=A entscheidungen ohne nutzer"
    die $EX_CONTRACT "Zug 0 für Paket $pkg hat »Entscheidungen« fortgeschrieben, aber der Nutzer war zu keinem Zeitpunkt erreichbar — kein Client am Fenster, kein offener Remote-Control-Kanal. Diese Antworten hat niemand gegeben. Der Plan ist unverändert zu behandeln: nimm die neuen Zeilen dort heraus, sei erreichbar — am Fenster ($TMUX_BIN attach -t $SESSION) oder über Remote Control — und starte erneut. Die Mitschrift liegt in $WORK/paket-$pkg.zug0.pane.log."
  fi

  # Es gibt keine Rückgabe zum Parsen. Der Plan trägt den Stand, und die Marke
  # sagt, was passiert ist. Das ist keine Notlösung: die Marke ist ohnehin die
  # Wahrheit, die Rückgabe war immer nur ihre Behauptung.
  RES=''; RAW="$PLAN"
  return 0
}

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
    say "    mit:  ${ALLOW_TOOLS:-—}"
    say "    ohne: ${DENY_TOOLS:-—}"
    if [ -n "$EXTRA_ARGS" ]; then say "    dazu: $EXTRA_ARGS"; fi
    printf '%s\n\n' "$brief"
    RES=''; RAW=''
    return 0
  fi

  RAW="$WORK/paket-$pkg.$role.json"
  ERR="$WORK/paket-$pkg.$role.stderr"
  say "→ Runner $role · Paket $pkg · $model/$effort"

  local before attempt pause
  tool_args
  before=$(snapshot)
  attempt=1
  while :; do
    rc=0
    claude -p "$brief" \
      --model "$model" \
      --effort "$effort" \
      --name "$SESSION-p$pkg-lauf" \
      ${FALLBACK_MODEL:+--fallback-model "$FALLBACK_MODEL"} \
      --session-id "$(uuid)" \
      --output-format json \
      --json-schema "$SCHEMA_JSON" \
      --permission-mode "$PERM" \
      --max-budget-usd "$BUDGET_USD" \
      ${TOOL_ARGS[@]+"${TOOL_ARGS[@]}"} \
      > "$RAW" 2> "$ERR" || rc=$?

    if [ "$rc" -eq 0 ] && jq -e '.is_error == false' "$RAW" >/dev/null 2>&1; then
      break
    fi

    transient_failure \
      || die $EX_AGENT "Runner $role für Paket $pkg ist gescheitert (Exit $rc) — siehe $RAW und $ERR"

    # Ein Neuversuch ist nur dann ein Neuversuch, wenn der gescheiterte Lauf
    # nichts hinterlassen hat. Sonst setzte er auf halber Arbeit auf, und das
    # entscheidet nicht dieses Skript, sondern der Nutzer nach resume.md.
    [ "$(snapshot)" = "$before" ] || die $EX_AGENT \
      "Runner $role für Paket $pkg ist an der überlasteten API gescheitert, hat vorher aber schon etwas verändert. Kein Neuversuch — der Stand gehört angesehen, siehe references/resume.md."

    [ "$attempt" -lt "$ATTEMPTS" ] || die $EX_BUSY \
      "Die API blieb über $ATTEMPTS Versuche überlastet. Nichts ist kaputt und nichts hat sich bewegt: dasselbe Kommando später erneut starten."

    pause=$(nth_backoff "$attempt")
    [ -n "$pause" ] || pause=300
    say "  API überlastet, Versuch $attempt von $ATTEMPTS. Warte ${pause}s."
    journal "paket=$pkg rolle=$role ueberlastet versuch=$attempt warte=${pause}s"
    sleep "$pause"
    attempt=$((attempt + 1))
  done

  cost=$(jq -r '.total_cost_usd // 0' "$RAW")
  TOTAL_COST=$(awk -v a="$TOTAL_COST" -v b="$cost" 'BEGIN { printf "%.4f", a + b }')

  denials=$(jq -r '(.permission_denials // []) | length' "$RAW")
  if [ "$denials" != "0" ]; then
    # Die abgelehnten Namen mitgeben: wer sie erst aus dem JSON suchen muss,
    # rät beim Erweitern, und der nächste Lauf scheitert an der nächsten Regel.
    local was
    was=$(jq -r '[(.permission_denials // [])[] | .tool_name] | unique | join(", ")' "$RAW" 2>/dev/null || true)
    die $EX_PERM "$(printf 'Runner %s fuer Paket %s wurde %s mal von der Rechteschranke gestoppt.\n  Abgelehnt: %s\n  Das gehoert in ALLOW_TOOLS. Die Allowlist ist zu eng, nicht das Paket zu schwer.\n  Vollstaendig in %s' "$role" "$pkg" "$denials" "${was:-siehe JSON}" "$RAW")"
  fi

  # Die Form garantiert das Schema; leer heißt, dass sie es trotzdem nicht tut.
  RES=$(jq -c 'try (if (.result | type) == "string" then (.result | fromjson) else .result end) catch empty' "$RAW")
  [ -n "$RES" ] || die $EX_CONTRACT "Rückgabe von Runner $role für Paket $pkg ist kein JSON nach dem Schema — siehe $RAW"

  local got
  got=$(jq -r '.package' <<<"$RES")
  [ "$got" = "$pkg" ] || die $EX_CONTRACT "Runner $role sollte Paket $pkg bearbeiten, gibt aber Paket $got zurück"

  # Die Rolle steuert im Skript nichts — es weiß ja, wen es gestartet hat. Sie
  # zu prüfen kostet nichts und fängt den Fall, in dem ein Runner seinen Auftrag
  # falsch gelesen hat: wer sich für A hält, hat womöglich Zug 0 gefahren.
  got=$(jq -r '(.role // "")' <<<"$RES")
  [ "$got" = "$role" ] || die $EX_CONTRACT "Runner $role für Paket $pkg gibt sich in der Rückgabe als '$got' aus"
}

field() { jq -r "(.$1 // \"\")" <<<"$RES"; }

# --- Vorlegen und anhalten --------------------------------------------------

hand_over() { # $1 = Rolle, $2 = Paketnummer, $3 = Status
  local frage
  frage=$(field for_you)
  say ""
  say "Paket $2 · Runner $1 · $3"
  say "$frage"
  # Die Frage gehört ins Journal und nicht nur ins Terminal: bei einem Lauf,
  # den niemand ansieht, ist das Terminal am nächsten Morgen weg.
  journal "paket=$2 rolle=$1 status=$3 -> Nutzer: $frage"
  say ""
  say "Die Schleife hält an. Antwort datiert in »Entscheidungen« im Plan eintragen,"
  say "dann dieses Skript erneut starten."
  say "Wortlaut nachlesbar in $RAW und $WORK/remediate.log."
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

  # Wer committet, hat delegiert, und der Beleg sind die Reports von
  # Implementierer und Reviewer auf der Platte. Beide laufen als eigene
  # Prozesse; ein Subagent hinterließe keine Datei und wäre hier kein Beleg.
  local impl rev
  # find statt ls: ein leerer Glob lässt ls scheitern und reißt unter
  # pipefail den ganzen Aufruf mit.
  impl=$(find "$WORK" -maxdepth 1 -name "paket-$1.impl-*.json" 2>/dev/null | wc -l | tr -d ' ')
  rev=$(find "$WORK" -maxdepth 1 -name "paket-$1.review-*.json" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$impl" -lt 1 ] || [ "$rev" -lt 1 ]; then
    die $EX_CONTRACT "Paket $1 wurde ohne Beleg für Implementierer und Reviewer committet: $impl Report(s), $rev Review(s) im Arbeitsverzeichnis. Ein Runner schreibt keinen Projektcode selbst."
  fi

  # Die Obergrenze der Fehlerkette. Eine Kette, die länger läuft, hat ein
  # anderes Problem als das, das sie behebt.
  local runden
  runden=$(jq -r '(.rounds // 0)' <<<"$RES")
  [ "$runden" -le "$MAX_ROUNDS" ] || die $EX_CONTRACT \
    "Paket $1 meldet $runden Runden, erlaubt sind $MAX_ROUNDS"
  [ "$impl" -le "$MAX_ROUNDS" ] || die $EX_CONTRACT \
    "Paket $1 hat $impl Implementierer-Reports bei $MAX_ROUNDS erlaubten Runden"

  local left
  left=$(dirty_paths)
  [ -z "$left" ] || warn "$(printf 'nach Paket %s liegt noch etwas im Arbeitsbaum:\n%s' "$1" "$left")"
}

# --- Die Schleife -----------------------------------------------------------


run_a() { # $1 = Paketnummer; Zug 0 im eigenen Fenster, danach entscheidet die Marke
  local m
  dispatch_zug0 "$1"
  if [ "$DRY" = 1 ]; then return 0; fi
  m=$(marker_of "$1")
  case "$m" in
    '~')
      say "  Detailplan steht"
      journal "paket=$1 rolle=A fenster marke=[~]"
      ;;
    'x')
      say "  entfallen oder ohne Commit erledigt"
      PACKAGES_DONE=$((PACKAGES_DONE + 1))
      journal "paket=$1 rolle=A fenster marke=[x]"
      ;;
    '!')
      say ""
      say "Paket $1 steht auf [!]. Was offen blieb, steht im Plan."
      journal "paket=$1 rolle=A fenster marke=[!] -> Nutzer"
      exit $EX_ASK
      ;;
    *)
      say ""
      say "Paket $1 steht unverändert auf [${m:-nichts}] — Zug 0 ist nicht"
      say "durchgelaufen. Ein zweiter Anlauf käme an dieselbe Stelle."
      journal "paket=$1 rolle=A fenster marke=[${m:-?}] abgebrochen"
      exit $EX_ASK
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
  local pass_on=()
  while [ $# -gt 0 ]; do
    case "$1" in
      --once) ONCE=1; pass_on[${#pass_on[@]}]=$1 ;;
      --dry-run) DRY=1 ;;
      --help|-h) usage; exit 0 ;;
      *) die $EX_PRE "unbekannte Option: $1" ;;
    esac
    shift
  done

  # Erst prüfen, dann ablösen: ein falscher Branch soll hier auffallen und
  # nicht in einer Session, in die niemand hineinsieht.
  preflight
  if [ "$INSIDE" = 0 ] && [ "$DRY" = 0 ]; then
    launch_tmux ${pass_on[@]+"${pass_on[@]}"}
  fi

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

    # --once meint ein ganzes Paket, nicht einen Zug: nach Zug 0 allein wäre
    # nichts geprüft, was sich zu prüfen lohnt.
    if [ "$ONCE" = "1" ] && [ "$PACKAGES_DONE" -ge 1 ]; then
      say ""
      say "--once: nach einem Paket angehalten. Kosten bisher: \$$TOTAL_COST"
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
