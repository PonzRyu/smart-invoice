# Podmanマシンを起動
Write-Host "Podmanマシンを起動しています..." -ForegroundColor Green
podman machine start

# Docker ComposeでPostgreSQLを起動
Write-Host "PostgreSQLコンテナを起動しています..." -ForegroundColor Green
podman-compose up -d

Write-Host "PostgreSQLが起動しました。" -ForegroundColor Green
Write-Host "接続情報:" -ForegroundColor Yellow
Write-Host "  Host: localhost"
Write-Host "  Port: 5432"
Write-Host "  User: postgres"
Write-Host "  Password: postgres"
Write-Host "  Database: postgres"

