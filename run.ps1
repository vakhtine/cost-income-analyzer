Set-Location $PSScriptRoot
Get-ChildItem -Recurse -Filter "__pycache__" | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
python -m streamlit run app.py
