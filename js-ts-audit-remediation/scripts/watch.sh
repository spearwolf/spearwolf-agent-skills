#!/usr/bin/env bash
# watch.sh — zeigt live, was die Runner eines Remediation-Laufs gerade tun.
#
#   watch.sh [--pid <pid der schleife>] [projektverzeichnis]
#
# Runner B, Implementierer und Reviewer laufen als »claude -p« ohne Terminal;
# ihre Ausgabe kommt erst am Ende als JSON. Mitgeschrieben wird trotzdem
# laufend: jede Sitzung hält ihr Transkript in
# ~/.claude/projects/<projekt>/<session>.jsonl. Dieses Skript folgt allen
# Transkripten, deren Sitzungsname ein Paket trägt (»…-p<N>-…«), und druckt
# daraus eine Zeile je Werkzeugaufruf, Ergebnis und Text. Es liest nur, es
# schreibt nirgendwo hin und greift in keinen Prozess ein.
#
# Mit --pid endet es von selbst, sobald dieser Prozess weg ist. So startet es
# die Schleife in ihrem Fenster »live«; ohne --pid läuft es bis Ctrl-C.
set -uo pipefail

PID=''
if [ "${1:-}" = --pid ]; then PID=${2:-}; shift 2; fi
PROJ=$(cd -- "${1:-.}" && pwd) || { echo "Kein Verzeichnis: ${1:-.}" >&2; exit 2; }
command -v jq >/dev/null 2>&1 || { echo "jq wird gebraucht." >&2; exit 2; }

# Die CLI legt das Transkript unter dem Pfad ab, in dem jedes Zeichen außer
# Buchstaben und Ziffern zu »-« wird.
DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/projects/$(printf '%s' "$PROJ" | sed 's/[^A-Za-z0-9]/-/g')"

FMT='
def clip($n): tostring | gsub("\\s+"; " ") | if length > $n then .[0:$n] + "…" else . end;
def zeit: (.timestamp // "")[0:19] + "Z" | try (fromdateiso8601 | strflocaltime("%H:%M:%S")) catch "--:--:--";
def text: if type == "string" then . elif type == "array" then map(.text? // "") | join(" ") else tostring end;
select(.type == "assistant" or .type == "user")
| zeit as $z | .type as $rolle
| "\($z) \($farbe)\($name)\u001b[0m" as $kopf
| (.message.content | if type == "string" then [{type: "text", text: .}] else . end)[]
| if .type == "text" then
    if $rolle == "assistant" then "\($kopf) 💬 \(.text | clip(400))"
    else "\($kopf) \u001b[2m📨 \(.text | clip(160))\u001b[0m" end
  elif .type == "tool_use" then
    "\($kopf) \u001b[36m▶ \(.name)\u001b[0m \((.input.command // .input.file_path // .input.pattern // .input.description // .input.prompt // (.input | tojson)) | clip(200))"
  elif .type == "tool_result" then
    if .is_error == true then "\($kopf)   \u001b[31m✗ \(.content | text | clip(200))\u001b[0m"
    else "\($kopf)   \u001b[2m↳ \(.content | text | clip(160))\u001b[0m" end
  else empty end
'

FARBEN=($'\e[33m' $'\e[35m' $'\e[32m' $'\e[34m' $'\e[91m' $'\e[96m')
declare -A GEFOLGT=()
n=0

# Beim Ende auch die tail-Prozesse mitnehmen, sonst laufen sie verwaist weiter.
trap 'trap - EXIT; kill 0 2>/dev/null' EXIT INT TERM

folge() { # $1 = Transkript, $2 = Anzeigename, $3 = tail-Startzeile
  local farbe=${FARBEN[$((n % ${#FARBEN[@]}))]}
  n=$((n + 1))
  printf '\e[1m── %s ──\e[0m\n' "$2"
  tail -n "$3" -F -- "$1" 2>/dev/null \
    | jq -r --unbuffered --arg name "[$2]" --arg farbe "$farbe" "$FMT" 2>/dev/null &
}

printf 'Folge den Runnern in %s\n' "$PROJ"
printf 'Transkripte: %s\n' "$DIR"
[ -n "$PID" ] && printf 'Endet mit der Schleife (PID %s).\n' "$PID"
printf 'Fenster wechseln: Ctrl-b 0 zur Schleife, Ctrl-b w für die Liste.\n\n'

erste_runde=1
while :; do
  if [ -n "$PID" ] && ! kill -0 "$PID" 2>/dev/null; then
    sleep 3
    printf '\nDie Schleife ist beendet — das Fenster geht zu.\n'
    sleep 5
    exit 0
  fi
  if [ -d "$DIR" ]; then
    # Beim Start nur, was in der letzten Viertelstunde lebte; danach jede
    # Sitzung, die sich in den letzten zwei Minuten bewegt hat.
    alter=2; [ "$erste_runde" = 1 ] && alter=15
    while IFS= read -r f; do
      [ -n "${GEFOLGT[$f]:-}" ] && continue
      titel=$(head -n 5 -- "$f" 2>/dev/null | grep -m1 -o '"customTitle":"[^"]*"' | sed 's/^"customTitle":"//; s/"$//')
      # Orchestrator und Zug 0 tragen keinen Paketnamen; Zug 0 hat sein eigenes Fenster.
      printf '%s' "$titel" | grep -qE -- '-p[0-9]+-' || continue
      GEFOLGT[$f]=1
      name=$(printf '%s' "$titel" | sed -E 's/^.*-(p[0-9]+-)/\1/')
      # Eine Sitzung, die schon lief, zeigt ihre letzten Zeilen; eine neue von Anfang an.
      if [ "$erste_runde" = 1 ]; then folge "$f" "$name" 30; else folge "$f" "$name" +1; fi
    done < <(find "$DIR" -maxdepth 1 -name '*.jsonl' -mmin "-$alter" -printf '%T@ %p\n' 2>/dev/null | sort -n | cut -d' ' -f2-)
  fi
  erste_runde=0
  sleep 2
done
