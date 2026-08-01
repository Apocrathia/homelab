#!/bin/sh
# Empty marker on the console/login user's Desktop (macOS + Linux).
# Triggered by policy "Fleet DM Was Here marker present" via run_script.
# Fails closed if no interactive user — never writes /tmp or $HOME.
set -eu

MARKER='Fleet DM Was Here'
user=''
home=''

if [ "$(uname -s)" = Darwin ]; then
  user=$(stat -f '%Su' /dev/console)
  case "$user" in
    '' | root | _mbsetupuser) user='' ;;
  esac
  if [ -n "$user" ]; then
    home=$(dscl . -read "/Users/$user" NFSHomeDirectory | awk '{print $2}')
  fi
else
  # fleetd has no TTY — logname fails; use the active seat session.
  session=$(loginctl show-seat seat0 -p ActiveSession --value 2>/dev/null || true)
  if [ -n "$session" ]; then
    user=$(loginctl show-session "$session" -p Name --value 2>/dev/null || true)
  fi
  if [ -z "$user" ]; then
    user=$(loginctl list-sessions --no-legend 2>/dev/null \
      | awk 'NF >= 3 && $3 != "" && $3 != "root" { print $3; exit }' || true)
  fi
  case "$user" in
    '' | root) user='' ;;
  esac
  if [ -n "$user" ]; then
    home=$(getent passwd "$user" | cut -d: -f6)
  fi
fi

if [ -z "$user" ] || [ -z "$home" ] || [ ! -d "$home" ]; then
  echo "no interactive user Desktop to write" >&2
  exit 1
fi

dest="$home/Desktop"
mkdir -p "$dest"
# Truncate so re-runs stay 0 bytes if something wrote into it.
: >"$dest/$MARKER"
chown "$user" "$dest/$MARKER"
