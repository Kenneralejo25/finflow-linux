# FinFlow — Guía de Despliegue en AWS EC2 (Linux Ubuntu)

FinFlow es un panel de control financiero moderno y planificador de ahorro. Esta guía te orientará en el despliegue del proyecto en una instancia de **AWS EC2 con Linux Ubuntu Server 22.04 LTS (Apto para Free Tier)**.

---

## Arquitectura de Despliegue

```text
                  [ Cliente (Navegador) ]
                             │ Port 80 (HTTP) / 443 (HTTPS)
                             ▼
                    [ Nginx Reverse Proxy ]
                             │ Port 5000 (Proxy)
                             ▼
                [ Node.js (Express Server) ]
                 │                       │
                 ▼ (Sirve estáticos)     ▼
         [ Frontend Build ]      [ Base SQLite3 File ]
```

---

## Requisitos Previos en AWS

1. **Crear una Instancia EC2**:
   - AMI: Ubuntu Server 22.04 LTS (Apto para el uso gratuito / Free Tier).
   - Tipo de Instancia: `t2.micro` o `t3.micro`.
2. **Configurar el Grupo de Seguridad (Security Group)**:
   - Añade reglas de entrada (Inbound Rules) para permitir:
     - **SSH**: Puerto 22 (restringido a tu IP o 0.0.0.0/0).
     - **HTTP**: Puerto 80 (0.0.0.0/0).
     - **HTTPS**: Puerto 443 (0.0.0.0/0).

---

## Paso 1: Conexión y Actualización del Sistema

Conéctate a tu servidor mediante SSH utilizando tu clave PEM de AWS:
```bash
ssh -i "tu-clave.pem" ubuntu@tu-ip-publica-ec2
```

Una vez dentro, actualiza los paquetes base del sistema:
```bash
sudo apt update && sudo apt upgrade -y
```

---

## Paso 2: Instalación de Node.js y Git

Instala Node.js (versión LTS) mediante NodeSource:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git build-essential
```

Verifica la instalación:
```bash
node -v
npm -v
```

---

## Paso 3: Clonación del Proyecto e Instalación de Dependencias

1. Clona el repositorio en el servidor (o sube los archivos mediante SCP/SFTP):
   ```bash
   git clone <URL_DE_TU_REPOSITORIO> ~/app
   cd ~/app/finflow-linux
   ```

2. **Instalar dependencias del Backend**:
   ```bash
   cd backend
   npm install
   ```

3. **Instalar y compilar el Frontend**:
   ```bash
   cd ../frontend
   npm install
   npm run build
   ```
   *Nota: Esto generará los archivos optimizados de producción dentro de `frontend/dist`.*

4. **Configurar el Backend para Servir el Frontend compilado**:
   Para simplificar el despliegue y no requerir múltiples puertos, configuraremos la API de Express para servir la carpeta `dist` de React directamente.
   Asegúrate de que tu `backend/server.js` sirva los archivos estáticos de producción. 
   *(El código provisto por defecto ya está configurado para ejecutarse en modo desacoplado con Nginx, pero a continuación configuramos Nginx para que sirva los estáticos directamente, lo cual es la mejor práctica de rendimiento).*

---

## Paso 4: Configurar Nginx y Servir el Proyecto

Nginx actuará como proxy inverso y servirá los archivos estáticos de React de forma ultrarrápida, redirigiendo las llamadas `/api` al servidor de Node.js.

1. Instala Nginx:
   ```bash
   sudo apt install nginx -y
   ```

2. Crea un archivo de configuración para FinFlow:
   ```bash
   sudo nano /etc/nginx/sites-available/finflow
   ```

3. Pega la siguiente configuración (reemplaza `tu-dominio-o-ip` con tu IP pública de AWS EC2 o tu dominio):
   ```nginx
   server {
       listen 80;
       server_name tu-dominio-o-ip;

       # Frontend - Archivos Estáticos
       location / {
           root /home/ubuntu/app/finflow-linux/frontend/dist;
           index index.html;
           try_files $uri $uri/ /index.html;
       }

       # Backend API Proxy
       location /api {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. Habilita la configuración y reinicia Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/finflow /etc/nginx/sites-enabled/
   sudo rm /etc/nginx/sites-enabled/default  # Elimina la configuración por defecto
   sudo nginx -t                             # Verifica que la sintaxis de Nginx esté bien
   sudo systemctl restart nginx
   ```

---

## Paso 5: Ejecutar el Servidor Node en Segundo Plano (PM2)

Para asegurarnos de que el servidor Express siga ejecutándose si cerramos la terminal o se reinicia la máquina:

1. Instala PM2 globalmente:
   ```bash
   sudo npm install pm2 -g
   ```

2. Inicia el backend de FinFlow:
   ```bash
   cd /home/ubuntu/app/finflow-linux/backend
   pm2 start server.js --name "finflow-backend"
   ```

3. Guarda la configuración y configúralo para que se inicie automáticamente en el arranque del sistema:
   ```bash
   pm2 save
   pm2 startup systemd
   ```
   *(Copia y ejecuta el comando que imprima en consola para finalizar el enlace de PM2 con systemd).*

---

## Paso 6: Abrir el Firewall de Linux (UFW)

Asegúrate de que el firewall interno de Ubuntu permita tráfico web:
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

---

## Paso 7: (Opcional) Instalar certificado SSL gratuito (HTTPS)

Si tienes un nombre de dominio apuntando a tu IP de EC2, puedes habilitar SSL de manera gratuita en 2 minutos:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d tu-dominio.com
```
Sigue los pasos y Certbot autoconfigurará tu Nginx para servir el sitio de manera segura mediante HTTPS.
