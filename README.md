<div align="center">

⭐ **Si te gusta este proyecto, ¡dale estrella al repositorio!** ⭐

---

# 🏟️ TimeSlot Engine

**Sistema de gestión de reservas de canchas de pádel, tenis y fútbol 5**

<img src="./frontend/public/background_hero.jpg" width="80%" alt="TimeSlot Engine Hero" />

![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

</div>

---

## 💡 Descripción General

**TimeSlot Engine** es un sistema completo de gestión de reservas para canchas deportivas (pádel, tenis, fútbol 5). Permite a los usuarios registrarse, explorar canchas disponibles, reservar horarios y gestionar sus reservas en tiempo real. Los administradores pueden gestionar canchas, reservas, políticas de cancelación y usuarios desde un panel dedicado.

### Características principales:

- **Autenticación JWT** con tokens de acceso y refresco
- **Motor de disponibilidad** con soporte de zonas horarias
- **Prevención de solapamientos** mediante restricciones EXCLUDE en PostgreSQL
- **Políticas de cancelación** configurables (globales o por cancha)
- **Notificaciones en tiempo real** via WebSocket
- **Interfaz responsive** para dispositivos móviles y escritorio

---

## ✨ Características

- **🔐 Autenticación segura:** Registro, login y gestión de sesiones con JWT y Argon2.
- **🏟️ Gestión de canchas:** CRUD completo con fotos, horarios y precios configurables.
- **📅 Motor de disponibilidad:** Generación de slots en tiempo real con soporte de zonas horarias.
- **🎯 Reservas inteligentes:** Prevención de solapamientos a nivel de base de datos.
- **📋 Políticas de cancelación:** Sistema de reglas por niveles (global, por cancha o por defecto).
- **🔔 Notificaciones WebSocket:** Eventos en tiempo real para reservas creadas, confirmadas o canceladas.
- **👥 Roles de usuario:** Administradores y clientes con permisos diferenciados.
- **📱 Diseño responsive:** Interfaz adaptable a cualquier dispositivo.
- **📊 Panel de administración:** Gestión completa de canchas, reservas y usuarios.
- **📸 Subida de imágenes:** Soporte para fotos de canchas con drag-and-drop.

---

## 👩‍💻 Stack Tecnológico

### Backend
- **NestJS** - Framework Node.js modular y escalable
- **Prisma** - ORM moderno para PostgreSQL
- **PostgreSQL** - Base de datos relacional con restricciones EXCLUDE
- **Passport.js** - Autenticación JWT
- **Argon2** - Hashing seguro de contraseñas
- **Socket.IO** - Comunicación WebSocket en tiempo real
- **Zod** - Validación de variables de entorno
- **Luxon** - Manejo de fechas y zonas horarias
- **Swagger + Scalar** - Documentación de API interactiva

### Frontend
- **React 19** - Biblioteca de interfaz de usuario
- **Vite** - Herramienta de construcción rápida
- **React Router** - Enrutamiento del lado del cliente
- **TanStack Query** - Gestión de estado del servidor
- **Axios** - Cliente HTTP con interceptor de tokens
- **Socket.IO Client** - Cliente WebSocket
- **Vitest** - Framework de testing

### Herramientas
- **pnpm** - Gestor de paquetes
- **TypeScript** - Tipado estático
- **ESLint + Prettier** - Calidad de código
- **Oxlint** - Linter rápido para frontend

---

## 📸 Capturas de Pantalla

### Página de Login
![Página de Login](./screenshots/login.png)

### Página de Registro
![Página de Registro](./screenshots/register.png)

### Página de Canchas (Listado)
![Página de Canchas](./screenshots/resources.png)

### Detalle de Cancha (Reserva)
![Detalle de Cancha](./screenshots/resource-detail.png)

### Mis Reservas
![Mis Reservas](./screenshots/bookings.png)

### Panel de Administración
![Panel de Administración](./screenshots/admin-dashboard.png)

### Gestión de Canchas (Admin)
![Gestión de Canchas](./screenshots/admin-courts.png)

### Gestión de Reservas (Admin)
![Gestión de Reservas](./screenshots/admin-bookings.png)

---

## 📦 Primeros Pasos

### 🚀 Requisitos Previos

- **Node.js** (v18.x o superior)
- **pnpm** (v8.x o superior)
- **PostgreSQL** (v14.x o superior)
- **Docker** (opcional, para base de datos)

### 🛠️ Instalación

1. **Clonar el repositorio:**

   ```bash
   git clone https://github.com/tu-usuario/timeslot-engine.git
   cd timeslot-engine
   ```

2. **Configurar la Base de Datos (usando Docker):**

   ```bash
   docker run -d \
     --name timeslot-db \
     -e POSTGRES_USER=timeslot \
     -e POSTGRES_PASSWORD=timeslot123 \
     -e POSTGRES_DB=timeslot_engine \
     -p 5432:5432 \
     postgres:16-alpine
   ```

3. **Configurar el Backend:**

   ```bash
   cd backend
   pnpm install
   cp .env.example .env
   # Editar .env con tu URL de base de datos y secretos JWT
   pnpm run prisma:generate
   pnpm run prisma:migrate
   pnpm run seed
   pnpm run dev
   ```

4. **Configurar el Frontend (en una nueva terminal):**

   ```bash
   cd frontend
   pnpm install
   pnpm run dev
   ```

5. **Acceder a la aplicación:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000/api
   - Documentación API: http://localhost:3000/docs
   - Referencia Scalar: http://localhost:3000/reference

### 🎮 Cuentas de Demostración

Después de ejecutar el comando de seed, puedes usar estas cuentas:

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@timeslot.dev | Admin#2026 |
| Cliente | juan@timeslot.dev | Client#2026 |
| Cliente | ana@timeslot.dev | Client#2026 |
| Cliente | luis@timeslot.dev | Client#2026 |

---

## 📖 Uso

### Ejecutar la Aplicación

**Modo desarrollo:**
```bash
# Backend
cd backend && pnpm run dev

# Frontend
cd frontend && pnpm run dev
```

**Modo producción:**
```bash
# Backend
cd backend && pnpm run build && pnpm run start:prod

# Frontend
cd frontend && pnpm run build && pnpm run preview
```

### 📃 Documentación de la API

La documentación de la API está disponible en:
- **Swagger UI:** http://localhost:3000/docs
- **Referencia Scalar:** http://localhost:3000/reference

### Endpoints Principales de la API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/register` | Registrar nuevo usuario |
| POST | `/api/auth/login` | Iniciar sesión (retorna par JWT) |
| GET | `/api/resources` | Listar todas las canchas |
| GET | `/api/availability?resourceId=X&date=Y` | Obtener slots disponibles |
| POST | `/api/bookings` | Crear una reserva |
| GET | `/api/bookings` | Listar reservas del usuario |
| PATCH | `/api/bookings/:id/cancel` | Cancelar una reserva |

---

## 🏗️ Arquitectura

### Esquema de Base de Datos

La aplicación utiliza 7 modelos principales:

- **User** - Usuarios con roles (ADMIN/CLIENT)
- **Resource** - Canchas con horarios y fotos
- **Booking** - Reservas con seguimiento de estado
- **ResourceSchedule** - Horarios de operación semanales
- **ResourcePhoto** - Imágenes de canchas
- **CancellationPolicy** - Reglas de cancelación por niveles
- **RefreshToken** - Gestión de tokens de refresco JWT

### Decisiones Técnicas Clave

1. **Prevención de Solapamientos:** Restricción EXCLUDE de PostgreSQL con índice GiST previene condiciones de carrera
2. **Manejo de Zonas Horarias:** Luxon convierte entre hora local del recurso y UTC
3. **Políticas de Cancelación:** Patrón Estrategia con tres implementaciones (Tiered, NoRefund, FreeUntilStart)
4. **Eventos en Tiempo Real:** Socket.IO con dirigimiento por salas (por usuario y salas de admin)
5. **Rotación de Tokens:** Los tokens de refresco antiguos se revocan en cada refresco

---

## 🤝 Contribuir

Damos la bienvenida a contribuciones a este proyecto. Por favor sigue estos pasos:

1. **Haz fork del repositorio.**
2. **Crea una nueva rama** (`git checkout -b feature/tu-caracteristica`).
3. **Haz tus cambios** y haz commit (`git commit -m 'Agregar alguna característica'`).
4. **Push a la rama** (`git push origin feature/tu-caracteristica`).
5. **Abre un pull request.**

Por favor asegúrate de actualizar las pruebas según corresponda.

### Guías de Desarrollo

- Sigue el estilo de código y convenciones existentes
- Escribe pruebas para nuevas características
- Actualiza la documentación según sea necesario
- Usa mensajes de commit convencionales

---

## 🐛 Problemas

Si encuentras algún problema, por favor revisa la sección de [Issues](https://github.com/tu-usuario/timeslot-engine/issues). Al reportar un problema, por favor incluye:

- Un título claro y descriptivo
- Pasos para reproducir el problema
- Comportamiento esperado vs actual
- Detalles del entorno (SO, navegador, versión de Node.js)
- Capturas de pantalla si aplica

---

## 📜 Licencia

Distribuido bajo la Licencia MIT. Ver [LICENSE](./LICENSE) para más información.

---

## 🙏 Agradecimientos

- [NestJS](https://nestjs.com/) por el increíble framework de backend
- [Prisma](https://www.prisma.io/) por el ORM moderno
- [React](https://react.dev/) por la biblioteca de UI
- [Vite](https://vitejs.dev/) por la herramienta de construcción rápida
- [Socket.IO](https://socket.io/) por la comunicación en tiempo real
