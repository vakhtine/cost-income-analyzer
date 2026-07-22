Set-Location $PSScriptRoot
python -m pip install -r requirements.txt -q
python -m uvicorn api.main:app --reload --host 127.0.0.1 --port 8000
