#!/bin/bash

# Podmanマシンを起動
echo "Podmanマシンを起動しています..."
podman machine start

# Docker ComposeでPostgreSQLを起動
echo "PostgreSQLコンテナを起動しています..."
podman-compose up -d

echo "PostgreSQLが起動しました。"
echo "接続情報:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  User: postgres"
echo "  Password: postgres"
echo "  Database: postgres"

