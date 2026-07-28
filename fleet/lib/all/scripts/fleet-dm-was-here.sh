#!/bin/sh
# Empty marker for the console/login user (macOS + Linux).
# Triggered by policy "Fleet DM Was Here marker present" via run_script.
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
  user=$(logname 2>/dev/null || true)
  case "$user" in
    '' | root) user='' ;;
  esac
  if [ -n "$user" ]; then
    home=$(getent passwd "$user" | cut -d: -f6)
  fi
fi

if [ -z "$home" ] || [ ! -d "$home" ]; then
  home=/tmp
  user=''
fi

if [ -d "$home/Desktop" ]; then
  dest="$home/Desktop"
else
  dest="$home"
fi

# Truncate so re-runs stay 0 bytes if something wrote into it.
: >"$dest/$MARKER"
if [ -n "$user" ]; then
  chown "$user" "$dest/$MARKER"
fi
