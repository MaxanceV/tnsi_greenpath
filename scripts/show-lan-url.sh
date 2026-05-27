#!/usr/bin/env bash
# Affiche les URLs à partager pour accéder à GreenPath depuis le LAN.
# Usage : ./scripts/show-lan-url.sh

set -e

# Détection de l'IP LAN (macOS + Linux)
if command -v ipconfig >/dev/null 2>&1; then
    # macOS
    IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)
fi

if [ -z "$IP" ]; then
    # Fallback Linux + macOS (extrait la première IP privée)
    IP=$(ifconfig 2>/dev/null | grep -Eo 'inet (192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)[0-9.]+' | awk '{print $2}' | head -1)
fi

if [ -z "$IP" ]; then
    echo "Impossible de détecter une IP LAN. Connectez-vous au Wi-Fi."
    exit 1
fi

echo ""
echo "  GreenPath — accès LAN"
echo "  ----------------------"
echo "  Frontend  : http://$IP:4200"
echo "  Backend   : http://$IP:8000"
echo "  Swagger   : http://$IP:8000/docs"
echo ""
echo "  Sur ton téléphone (même Wi-Fi), ouvre :"
echo "    http://$IP:4200"
echo ""
echo "  Les QR codes générés depuis cette IP seront scannables par les téléphones."
echo ""
