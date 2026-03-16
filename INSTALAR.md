# Dashwey PWA — Guía de instalación

## Estructura de archivos (mantener juntos)
```
dashwey/
├── Dashwey_v82.html   ← app principal
├── manifest.json       ← configuración PWA
├── sw.js               ← service worker (offline + caché)
├── icon-192.png        ← icono app
└── icon-512.png        ← icono splash screen
```

⚠️ Los 5 archivos deben estar SIEMPRE en la misma carpeta.

---

## Opción A — GitHub Pages (recomendado, gratis)

1. Ve a https://github.com y crea cuenta gratis
2. Crea repositorio nuevo → nombre: `dashwey`
3. Sube los 5 archivos (arrastra y suelta)
4. Ve a Settings → Pages → Branch: main → Save
5. Tu URL será: `https://TU-USUARIO.github.io/dashwey/Dashwey_v82.html`
6. Abre esa URL en Chrome Android → aparecerá el banner "Instalar Dashwey"

---

## Opción B — Servidor local con Python (sin internet)

```bash
# Navega a la carpeta con los archivos
cd ruta/a/dashwey

# Inicia servidor
python3 -m http.server 8080

# Abre en el móvil (misma red WiFi)
# http://IP-DE-TU-PC:8080/Dashwey_v82.html
```

---

## Opción C — Termux en Android (servidor en el propio móvil)

```bash
pkg install python
cd /sdcard/dashwey
python -m http.server 8080
# Abre: http://localhost:8080/Dashwey_v82.html
```

---

## Instalar en iOS (Safari)

1. Abre la URL en Safari
2. Toca el botón Compartir ⎋
3. "Añadir a pantalla de inicio"
4. Confirmar → Dashwey aparece como app nativa

---

## Por qué funciona la subida de imágenes ahora

Con el Service Worker activo y HTTPS (GitHub Pages lo da gratis),
el navegador concede permisos completos de FileReader y acceso
a la galería/cámara, igual que una app nativa.
