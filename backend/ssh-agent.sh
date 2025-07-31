#!/bin/bash
eval "$(ssh-agent)"
echo "$1" | tr -d '\r' | ssh-add - >/dev/null
ssh-keyscan -t rsa "$2" >>/root/.ssh/known_hosts
if [ -z "$6" ]; then
  git clone -c http.extraheader="$4: $5" "$3" .
else
  git clone -c http.extraheader="$4: $5" "$3" --branch "$6" .
fi
