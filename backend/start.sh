#!/bin/bash
cd "$(dirname "$0")"

pip3 install -r requirements.txt

python3 manage.py makemigrations
python3 manage.py migrate

python3 init_data.py

python3 manage.py runserver 0.0.0.0:9202
