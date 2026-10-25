# Módulos — referencia detallada

Documentación extendida de PQRS, PDM, SECOP, Planes, gestión documental, PIC y chat IA.

## Módulo PQRS

Gestión completa del ciclo de vida de PQRS conforme a la Ley 1755 de 2015.

### Flujo

```
Ciudadano crea PQRS (manual, portal público o vía IA)
  └─→ Estado: RECIBIDA
       └─→ Admin asigna a Secretaría
            └─→ Estado: ASIGNADA
                 ├─→ Secretario responde → Estado: RESPONDIDA → Admin cierra → CERRADA
                 └─→ Secretario rechaza → Estado: RECHAZADA_ASIGNACIÓN → Admin reasigna
```

### Roles que interactúan con PQRS

| Rol | Permisos |
|---|---|
| `superadmin` | Gestión de entidades (crear/editar); **no opera PQRS** |
| `admin` | CRUD PQRS de su entidad, asignar/reasignar, cerrar, reabrir, eliminar adjuntos, usuarios |
| `secretario` | Ver PQRS asignadas a su secretaría, responder, rechazar asignación, delegar a contratistas |
| `contratista` | Ver y responder PQRS delegadas a su usuario; productos PDM asignados |
| `ciudadano` | Crear y consultar sus PQRS (si el módulo está habilitado) |

La jerarquía **secretario → contratista** permite crear contratistas supervisados, limitar módulos y delegar PQRS (`POST .../asignar-usuario/`) o productos PDM (`PATCH .../responsable-usuario`).

### Endpoints PQRS (autenticados)

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/v1/pqrs/stats/` | Agregados para dashboard (conteos por estado, tipo, canal, secretaría) |
| `GET` | `/api/v1/pqrs/` | Listar PQRS (paginado; filtros abajo) |
| `POST` | `/api/v1/pqrs/` | Crear PQRS manual (soporta multipart con `archivos`) |
| `GET/PATCH` | `/api/v1/pqrs/{id}/` | Detalle / editar |
| `DELETE` | `/api/v1/pqrs/{id}/` | Eliminar (admin) |
| `POST` | `/api/v1/pqrs/{id}/asignar/` | Asignar a secretaría `{secretaria_ids, justificacion}` |
| `POST` | `/api/v1/pqrs/{id}/asignar-usuario/` | Delegar a contratistas `{user_ids, justificacion}` |
| `POST` | `/api/v1/pqrs/{id}/rechazar-asignacion/` | Rechazar asignación `{motivo}` |
| `POST` | `/api/v1/pqrs/{id}/responder/` | Responder PQRS (multipart: `respuesta` + `archivo_respuesta`; opcional `enviar_email`) |
| `POST` | `/api/v1/pqrs/{id}/cerrar/` | Cerrar PQRS |
| `POST` | `/api/v1/pqrs/{id}/reabrir/` | Reabrir PQRS respondida |
| `GET/POST` | `/api/v1/pqrs/{id}/archivos/` | Listar / subir archivos adjuntos |
| `DELETE` | `/api/v1/pqrs/{id}/archivos/{aid}/` | Eliminar archivo adjunto (admin) |
| `POST` | `/api/v1/pqrs/auto-create/` | **Crear PQRS con IA** (texto + archivos) |

### Portal ciudadano (público, sin autenticación)

Ruta frontend: `/portal/:slug` (ej. `/portal/alcaldia-ejemplo`).

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/v1/public/entity/{slug}/` | Datos de la entidad (nombre, logo, horarios…) |
| `POST` | `/api/v1/public/entity/{slug}/pqrs/` | Crear PQRS manual desde el portal |
| `POST` | `/api/v1/public/entity/{slug}/pqrs/auto/` | Crear PQRS con IA desde el portal |

Rate-limit: `30/hour` por IP en endpoints públicos; `20/hour` por usuario en `POST /api/v1/pqrs/auto-create/` (autenticado).

### Listado PQRS (filtros y paginación)

Query params soportados en `GET /api/v1/pqrs/`:

| Param | Descripción |
|---|---|
| `page`, `page_size` | Paginación (**obligatorio** `page`; default página 1) |
| `search` | Radicado, asunto, nombre o cédula |
| `estado`, `tipo_solicitud`, `assigned_to` | Filtros exactos |
| `fecha_desde`, `fecha_hasta` | Rango de `fecha_solicitud` (informes) |
| `pendientes=true` | Excluye respondidas y cerradas |
| `alerta=true` | Vencen en ≤5 días y siguen abiertas |


Rutas frontend (módulo con pestañas, sin modales):

| Ruta | Descripción |
|---|---|
| `/pqrs` | Resumen (dashboard de indicadores) |
| `/pqrs/solicitudes` | Listado, filtros y paginación |
| `/pqrs/nueva` | Crear PQRS (manual o IA) |
| `/pqrs/:id` | Detalle, respuesta, asignación e historial |
| `/pqrs/:id/editar` | Editar datos de la solicitud (admin) |
| `/pqrs/informes` | Informes PDF (requiere `enable_reports_pdf`) |

Compatibilidad: `/dashboard` → `/pqrs` · `/informes` → `/pqrs/informes`.

- Máximo **4 archivos** por PQRS (campo `archivos` en multipart).
- Ruta de almacenamiento (B2 `softone-pqrs`):
  - Solicitud (adjuntos ciudadano): `entities/<entity_id>/<numero_radicado>/solicitud/<nombre_seguro>`
  - Respuesta (adjunto secretaría): `entities/<entity_id>/<numero_radicado>/respuesta/<nombre_seguro>`
  - Ejemplo: `entities/1/PQRS-1-20260608-001/solicitud/documento.pdf`
- Formatos soportados para extracción de texto: PDF, DOCX, TXT, CSV, MD.
- Los archivos se sirven vía `MEDIA_URL=/media/` y requieren **token Clerk válido** (`ProtectedMediaView`); el frontend usa `downloadAuthenticatedFile` / `openAuthenticatedFile` en lugar de enlaces directos.

### Ingreso automático por correo (IMAP)

Un admin o secretario **reenvía** la PQRS desde su correo institucional (`*.gov.co`) al buzón `pqrssoftone@gmail.com`. Un cron lee el buzón por IMAP cada 3 minutos y:

1. Valida que el remitente (`From`) sea un **usuario registrado** en la plataforma con rol `admin` o `secretario` y entidad asignada (correo del usuario en Usuarios).
2. Opcionalmente exige dominio `.gov.co` (`PQRS_INBOUND_REQUIRE_GOVCO=true`).
3. Extrae texto y adjuntos del correo reenviado.
4. Usa **OpenAI** (`extraer_pqrs_con_ia`) para estructurar y clasificar la PQRS.
5. Crea la PQRS con `canal_llegada=email`, adjuntos y asignación automática a secretaría (IA; fallback: secretaría del usuario que reenvió).
6. Envía confirmación de radicación al ciudadano si hay email.

Correos de remitentes no registrados se **ignoran** (aunque sean `gov.co`). Cada `Message-ID` se registra en `CorreoEntrantePQRS` para idempotencia.

Antes de la IA, el sistema extrae el cuerpo reenviado, lee el **From/De original** del bloque reenviado (ej. `amadolargo@gmail.com` o `concejo@otro-municipio.gov.co`) y lo usa como `email_ciudadano` y `medio_respuesta=email`. Solo se ignoran el correo del funcionario que reenvía y la bandeja institucional de **esta** entidad (ej. `gobierno@chiquiza-boyaca.gov.co` en To). Otros `@*.gov.co` de entidades distintas sí se conservan como solicitante. Si hay varios correos del solicitante en el hilo, se guardan separados por coma.

**Comando manual:**

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file .env exec -T backend \
  python manage.py ingest_pqrs_inbox
```

**Variables (.env):**

```
PQRS_INBOUND_ENABLED=true
PQRS_INBOUND_REQUIRE_GOVCO=true
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=pqrssoftone@gmail.com
IMAP_PASSWORD=<app-password-gmail>
IMAP_MAILBOX=INBOX
```

Log del cron: `logs/softone-pqrs-inbox.log` (en `/opt/softone-app/logs/`).

### Integración Gmail (Add-on + OAuth, opcional)

Complemento al IMAP/ZeptoMail: radicar desde Gmail con add-on HTTP y enviar respuestas desde la cuenta institucional del funcionario (`gmail.send`). Documentación completa: [docs/google-gmail-pqrs.md](docs/google-gmail-pqrs.md).

- Add-on: `POST /api/v1/google-addon/gmail/{open|preview|radicate}`
- OAuth: `/api/v1/integrations/google/*`
- Frontend: `/configuracion/correo`
- Activar envío: `GOOGLE_GMAIL_SEND_ENABLED=true` + credenciales Google en `.env`

**Demo (servidor `192.168.88.2`, `/opt/softone-demo/.env`):** Gmail operativo en demo (2026-09-23).

| Variable | Valor (demo) |
|---|---|
| OAuth web (`gmail.send`) | `762289632417-52omj9cddrb5hfrsksck1ditd65lubr3.apps.googleusercontent.com` |
| Add-on HTTP (tokens Gmail) | `762289632417-9r0uq8vd7ed57tvfkkrcqk1vkjhpa5hs.apps.googleusercontent.com` → `GOOGLE_ADDON_CLIENT_ID` |
| Redirect | `https://demo.softone360.com/api/v1/integrations/google/callback` |
| Envío | `GOOGLE_GMAIL_SEND_ENABLED=true` |

El **client secret** OAuth web solo en `.env` del servidor (no en el repo).

Clave Fernet tokens OAuth en PostgreSQL (demo): generar en el servidor con `openssl rand -base64 32` → `GOOGLE_TOKEN_ENCRYPTION_KEY` (no commitear; si cambia, cada usuario debe reconectar Gmail).

Manifiesto add-on: [`deploy/google-addon/deployment.json`](deploy/google-addon/deployment.json) (HTTP Deployments en GCP + **Install**).

Tras cambiar variables Google: `docker compose -f deploy/docker-compose.demo.yml --env-file .env up -d --build demo-backend` en `/opt/softone-demo`.

- Envío: https://demo.softone360.com/configuracion/correo → **Conectar con Google**
- Radicación: Gmail → correo abierto → complemento **SoftOne PQRS** → **RADICAR COMO PQRS** (`email_domains`, `enable_ai_reports`, mismo email en Usuarios)

---

## Módulo PDM — Productos con varios indicadores

Un mismo **código de producto MGA** (7 dígitos, p. ej. `4003018`) puede tener **varias filas** en el Excel del Plan Indicativo, una por **indicador** (`400301802`, `400301807`, …), con metas y presupuesto PPI distintos.

| Campo | Uso |
|-------|-----|
| `clave_producto` | Identificador único por entidad; URL de detalle `/pdm/productos/{clave}`. Si no hay repetidos, `clave = codigo_producto`. |
| `codigo_producto` | Código MGA de 7 dígitos; une ejecución presupuestal y contratos RPS (compartidos entre indicadores del mismo producto). |
| `codigo_indicador_producto_mga` | Código del indicador (9 dígitos). |
| `codigo_indicador_producto` | Código SisPT (`IP-35`, …); desempate cuando el indicador MGA se repite. |

Tras actualizar el backend, **recargar el Excel** del Plan Indicativo para materializar todas las filas. Para despliegue, ver la sección [Despliegue](#despliegue-producción--demo-en-paralelo).

---

## Módulo PDM — Armonización presupuesto ↔ PDM

Cuando el Excel de **ejecución presupuestal** trae códigos que no existen en el Plan Indicativo (p. ej. `1906004`), el dashboard muestra la advertencia **Ejecución sin producto en el Plan Indicativo**. Un **admin** puede **armonizar** ese código asignándolo a un producto real del plan (p. ej. `0401105`).

- La ejecución del código origen se **suma ítem por ítem** al producto destino (no se elimina la ejecución previa del destino).
- La armonización es **global** (todos los años) y persiste en recargas futuras del Excel.
- El código original del Excel se conserva en `codigo_producto_origen`; `codigo_producto` es el código efectivo usado en dashboard, análisis e informes.

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/v1/pdm/ejecucion/armonizaciones/` | Lista armonizaciones vigentes (admin) |
| `POST` | `/api/v1/pdm/ejecucion/armonizaciones/` | Crear armonización `{codigo_origen, codigo_destino, nota?}` |
| `DELETE` | `/api/v1/pdm/ejecucion/armonizaciones/{id}/` | Revertir armonización |
| `GET` | `/api/v1/pdm/ejecucion/armonizaciones/candidatos/?search=` | Productos del plan para el selector |

UI: **PDM → Resumen** → tarjeta de advertencia → botón **Armonizar** (solo admin). Para consultar o revertir las vigentes en cualquier momento: **PDM → Acciones → Armonizaciones presupuesto**.

Requiere migración `pdm.0010_pdm_armonizacion`.

---

## Módulo PDM — Ejecución presupuestal mensual (PIIP)

Complementa la carga anual general (dashboard/análisis) con **cargas por mes** usadas en el export PIIP y en informes con corte mensual.

- **Acciones → Ejecución mensual (PIIP)** (solo `admin`): tabla de los 12 meses del año (cargado/pendiente), subida, reemplazo y borrado por mes.
- El sistema detecta mes/año del título del Excel (`Del 01/07/2026 Al 31/07/2026` en celda A1). Si el rango es acumulado (más de un mes), responde `409` hasta confirmar.
- `REGISTRO`, `SALDO COMPROMISOS` y `PAGOS` se guardan **tal cual vienen** en el archivo (si vienen en 0, quedan en 0).
- Las armonizaciones presupuesto ↔ PDM aplican también a la ejecución mensual.

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/v1/pdm/ejecucion/mensual/?anio=` | Estado de los 12 meses (carga, rango, totales) |
| `POST` | `/api/v1/pdm/ejecucion/mensual/upload` | Subir Excel mensual (`file`, opcional `confirmar=true`) |
| `DELETE` | `/api/v1/pdm/ejecucion/mensual/<anio>/<mes>/` | Eliminar carga de un mes |

Requiere migración `pdm.0011_pdm_ejecucion_mensual_fecha_ejecucion`.

---

## Módulo PDM — Exportar PIIP

Desde el menú **Acciones** del PDM (rol `admin`), **Exportar PIIP** abre un modal para elegir **año y mes** y descarga un Excel (`.xlsx`) con productos que tienen BPIN y meta programada en el año indicado. El archivo **no se guarda** en el servidor ni queda historial. Si un producto tiene varios BPIN (separados por coma), o varias fuentes presupuestales, se genera **una fila por cada BPIN y por cada fuente**. Las fuentes se normalizan al catálogo PIIP (Propios, SGP - Salud, …, Otros).

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/v1/pdm/v2/{slug}/export-piip?anio=2026&mes=7` | Descarga `PIIP_{slug}_{anio}_{MM}.xlsx` (encabezados verde `#6AA84F`, texto blanco) |

Query params: `anio` (obligatorio para corte mensual), `mes` (1–12, recomendado). Con `mes`, el mapeo por producto y fuente es:

| Columna PIIP | Origen |
|---|---|
| VALOR INICIAL | Pto. definitivo de la **carga anual** por fuente |
| Comprometido cada mes | `REGISTRO` del mes, por cada fuente PIIP alineada con la carga anual (solo filas con pto. definitivo > 0; excluye movimientos auxiliares como `R.B.` que comparten categoría MGA) |
| Pago Cada mes | `PAGOS` del mes (misma regla de alineación por fuente) |
| Comprometido Acumulado | Suma de `REGISTRO` meses 1→mes (misma regla de alineación) |
| Pago Acumulado | Suma de `PAGOS` meses 1→mes |
| VALOR EJECUTADO | Pago Acumulado al mes |
| CANTIDAD META EJECUTADA | Meta ejecutada con corte por `fecha_ejecucion` ≤ fin de mes |

---

## Módulo PDM — Fecha de ejecución (evidencias)

Las actividades PDM usan un único campo **`fecha_ejecucion`** (en lugar de fecha inicio/fin). Define a qué mes pertenece la evidencia en informes y export PIIP: una actividad registrada en febrero con fecha de ejecución 15/01/2026 **sí** aparece en el informe de enero.

UI: modal **Nueva evidencia de ejecución** → campo **Fecha de ejecución** (obligatorio, limitado al año de la actividad).

---

## Informes PDM

Pestaña **Informes** en el módulo PDM (roles `admin` y `secretario`). La sección agrupa varios tipos de informe; botón **Crear informe** con selector de tipo:

| Tipo | Formato | Comportamiento |
|---|---|---|
| **Informe de Avance de PDM** | PDF | Generación **asíncrona** con Celery: membrete institucional, gráficas, ejecución por producto y evidencias. Historial con retención **7 días**. |
| **Plan de Acción** | Excel | Descarga **inmediata** vía `GET /export-plan-accion/`; no se guarda en servidor ni hay historial. Tres hojas: actividades, resumen por producto/meta y resumen por dependencia. |
| **Informe de Gestión** | PDF | Próximamente (`tipo=GESTION`). |

Generación PDF **asíncrona** con Celery (membrete institucional, gráficas matplotlib, ejecución por producto y evidencias opcionales).

**Membrete Word por entidad:** cada entidad sube su plantilla **.docx** (Superadmin → entidad → **Subir .docx**). Al generar informes (PDM, Planes, PQRS), el backend convierte el membrete a PDF con LibreOffice (campos **PAGE** / **NUMPAGES** o marcadores `{{PAGINA}}` / `{{TOTAL}}`) y lo superpone página a página. Los membretes PDF antiguos **dejan de usarse**: hay que volver a subir el formato en Word. Lógica en `backend/apps/common/docx_template.py`.

**Tipografía:** el contenedor incluye fuentes con métricas equivalentes a Word (Liberation/Arial, Carlito/Calibri, Caladea/Cambria, etc.). Al subir el membrete, el backend **instala automáticamente** fuentes embebidas en el `.docx` o, si existen como fuente libre, las **descarga** (Fontsource) en `/app/data/fonts`. La API devuelve `installed_fonts` y `missing_fonts` si aún queda alguna sin sustituto. Desactivar descarga: `DOCX_AUTO_INSTALL_FONTS=false`. Verificación: `python manage.py render_membrete <slug> --pages 12 --out /tmp/membrete.pdf --png`.

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/v1/pdm/v2/{slug}/informes/?tipo=AVANCE` | Historial PDF por tipo (purga perezosa de expirados) |
| `POST` | `/api/v1/pdm/v2/{slug}/informes/` | Encola generación PDF → `201` con estado `PENDIENTE`; `409` si ya hay uno del mismo tipo en cola/proceso |
| `GET` | `/api/v1/pdm/v2/{slug}/informes/{id}/download/` | Descarga PDF desde B2 (bucket PDM) |
| `DELETE` | `/api/v1/pdm/v2/{slug}/informes/{id}/` | Elimina registro PDF y archivo en B2 |
| `GET` | `/api/v1/pdm/v2/{slug}/export-plan-accion?anio=2026&responsable_secretaria=` | Descarga Excel Plan de Acción (inmediato; encabezados cyan `#0E7490`) |

**Body POST (PDF):** `tipo` (`AVANCE`; `GESTION` rechazado hasta implementación), `anio`, `mes` (1–12, corte por `fecha_ejecucion`), `usuario_firmante_id` (obligatorio), `responsable_secretaria_id` (opcional; admin filtra dependencia), `incluir_evidencias` (default `true`), `usar_ia` (solo si `enable_ai_reports`).

**Query params Excel Plan de Acción:** `anio` (2024–2027; default año actual), `mes` (1–12, opcional; filtra actividades por `fecha_ejecucion`), `responsable_secretaria` (opcional; admin filtra dependencia; secretario queda forzado a su secretaría).

Rutas frontend:

| Ruta | Descripción |
|---|---|
| `/pdm/informes` | Historial PDF + botón **Crear informe** (selector de tipo; Plan de Acción Excel abre modal de configuración) |

**Tipos:** `AVANCE` = Informe de Avance de PDM (PDF) · Plan de Acción = Excel inmediato · `GESTION` = Informe de Gestión (próximamente).

**Roles:** `admin` puede filtrar por dependencia o toda la entidad; `secretario` queda forzado a su secretaría (PDF y Excel). Retención PDF **7 días** (`expires_at`); purga automática Celery Beat `03:45` (`purge_expired_informes_pdm`) y al listar. Requiere `celery-worker` y `celery-beat` activos para PDF.

---

## Módulo Contratación (SECOP I y SECOP II)

Análisis de contratación pública de la entidad a partir de **datos abiertos** ([datos.gov.co](https://www.datos.gov.co)). Consulta **en vivo por vigencia (año)** con caché Redis; no replica contratos en PostgreSQL.

### Activación

1. **Superadmin → Entidad → Módulos:** activar **Contratación (SECOP)** (`enable_contratacion`).
2. Configurar **NIT SECOP I** y/o **NIT SECOP II** (opcional; varios NIT separados por coma). Si están vacíos, se usa el NIT general de la entidad.
3. **Identidad SECOP:** si el NIT es compartido (ej. Alcaldía, Concejo y Personería del mismo municipio), use **Superadmin → Entidad → Buscar entidades** para seleccionar la entidad real en datos.gov.co (`codigo_entidad` + `nombre_entidad`). Esto evita traer contratos de otras dependencias con el mismo NIT.
4. En demo/prod, agregar `SECOP_OPENAI_API_KEY` en `.env` del servidor (API key dedicada; **no** commitear al repo).

### Fuentes de datos

| Dataset | ID datos.gov.co | Contenido |
|---|---|---|
| SECOP II contratos | `jbjy-vk9h` | Procesos **con** contrato firmado |
| SECOP II procesos | `p6dx-8zbt` | Procesos **sin** contrato |
| SECOP I | `f789-7hwg` | Contratos históricos SECOP I |
| SECOP II facturas | `ibyt-yi2f` | Pagos reales por contrato (fecha, valor, estado) |
| SECOP II modificaciones | `u8cx-r425` | Adiciones, prórrogas, suspensiones, liquidación |

SECOP II unifica contratos + procesos sin duplicar: enlace por `proceso_de_compra` ↔ `id_del_portafolio` (respaldo: `noticeUID` en URL). Duplicados SECOP I se eliminan por `uid`. Las facturas y modificaciones se enriquecen por `id_contrato` (caché 6 h).

**Nota:** SECOP I no publica pagos por contrato; las alertas financieras solo aplican a SECOP II.

### Frontend

Ruta: `/contratacion` — pestañas **Resumen**, **Ejecución**, **Dependencias** (por supervisor/ordenador), **SECOP II**, **SECOP I**, **Alertas**, **Análisis IA**, **Copiloto**. Selector de vigencia (año) global.

### Endpoints (`/api/v1/secop/`)

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/config/` | NITs, identidad SECOP, años disponibles, tendencias |
| `GET` | `/resumen/?anio=` | KPIs consolidados + comparativo año anterior |
| `GET` | `/ejecucion/?anio=&supervisor=&semaforo=` | Avance por contrato (tiempo, financiero, semáforo) |
| `GET` | `/dependencias/?anio=` | Agregados por supervisor y ordenador del gasto |
| `GET` | `/vencimientos/?anio=` | Buckets: vencidos, por vencer, sin liquidar |
| `GET` | `/pagos/?anio=` | Curva de pagos, facturas recientes, contratos sin pago |
| `GET` | `/secop2/?anio=&page=&search=&…` | Lista unificada SECOP II (contratos + procesos sin contrato) |
| `GET` | `/secop2/analitica/?anio=` | Gráficos y distribuciones SECOP II |
| `GET` | `/secop1/?anio=&…` | Contratos SECOP I |
| `GET` | `/secop1/analitica/?anio=` | Analítica SECOP I |
| `GET` | `/alertas/?anio=` | Alertas de riesgo (vencimientos, financieras, transparencia) |
| `GET` | `/detalle/?fuente=&id=&anio=` | Ficha de contrato/proceso (pagos, modificaciones, avance) |
| `GET` | `/export/?anio=&fuente=` | Excel (unificado, secop1, secop2, alertas, ejecucion, pagos, vencimientos) |
| `GET` | `/entidades-datos-gov/?nit=` | Selector de entidad real por NIT (superadmin) |
| `POST` | `/refrescar/` | Invalida caché Redis de la entidad |
| `POST` | `/ai/analisis/` | Análisis IA estructurado (JSON + texto) de la vigencia |
| `POST` | `/ai/copilot/` | Chat copiloto con gráficas dinámicas según la pregunta |
| `POST` | `/ai/contrato/` | Resumen IA de un contrato |

Roles: `admin`, `secretario`. Throttle: `secop_datos_gov` 120/h, `secop_ai` 30/h.

### Alertas automáticas (reglas)

Vencidos en ejecución, por vencer (7/15/30 días), sin liquidar (+4 meses), saldo pendiente, sobrepago, adiciones >50 % (SECOP I), concentración de proveedores, contratación directa elevada, procesos desiertos, firmas en diciembre, posible fraccionamiento, etc.

### Variables de entorno

```
SECOP_OPENAI_API_KEY=sk-...       # obligatoria para IA SECOP
SECOP_OPENAI_MODEL=gpt-4o-mini    # opcional
SECOP_CACHE_TTL=21600             # 6h caché consultas datos.gov.co
SECOP_ENRICH_ENABLED=true         # enriquecer SECOP II con facturas y modificaciones
SECOP_ENRICH_MAX_CONTRATOS=500    # límite de contratos a enriquecer por vigencia
```

**Demo:** agregar `SECOP_OPENAI_API_KEY` en `/opt/softone-demo/.env` y redeploy (`development`).

---

## Módulo Planes Institucionales (Decreto 612 de 2018)

Seguimiento trimestral a los **12 planes institucionales y estratégicos** que las entidades del Estado deben integrar al Plan de Acción y publicar en su web a más tardar el **31 de enero** de cada año (Decreto 612 de 2018):

1. Plan Institucional de Archivos (PINAR)
2. Plan Anual de Adquisiciones
3. Plan Anual de Vacantes
4. Plan de Previsión de Recursos Humanos
5. Plan Estratégico de Talento Humano
6. Plan Institucional de Capacitación
7. Plan de Incentivos Institucionales
8. Plan de Trabajo Anual en Seguridad y Salud en el Trabajo
9. Programa de Transparencia y Ética Pública (PTEP)
10. Plan Estratégico de TIC (PETI)
11. Plan de Tratamiento de Riesgos de Seguridad y Privacidad de la Información
12. Plan de Seguridad y Privacidad de la Información

### Flujo

```
Admin activa módulo → selecciona plan del catálogo + vigencia (año)
  └─→ Asigna secretaría responsable (plan y actividades)
       └─→ Crea actividades/componentes por trimestre (I–IV)
            └─→ Secretario delega a contratista (opcional)
                 └─→ Registra avance + evidencia (archivos PDF/Office/imagen o URL)
                      └─→ Informes: seguimiento PDF (async, 7 días) + trimestral Excel + cronograma Gantt
```

### Roles

| Rol | Permisos |
|---|---|
| `admin` | CRUD planes y actividades, asignar secretaría, exportar informes (Excel y PDF), eliminar |
| `secretario` | Planes/actividades de su secretaría, crear/editar actividades, evidencia, delegar contratistas, generar informes de su dependencia |
| `contratista` | Actividades asignadas, registrar avance y evidencia |
| `superadmin` | Activa `enable_planes_institucionales`; no opera el módulo |

### Endpoints (`/api/v1/planes/`)

| Método | Endpoint | Descripción |
|---|---|---|
| `GET/POST` | `/planes/catalogo/` | Catálogo Decreto 612 + planes propios de la entidad |
| `GET/POST` | `/planes/` | Listar / crear plan por vigencia |
| `GET/PATCH/DELETE` | `/planes/{id}/` | Detalle / editar / eliminar |
| `GET` | `/planes/stats/?anio=` | Dashboard (avance por trimestre, vencidas…) |
| `GET` | `/planes/cronograma/?anio=` | Datos para vista Gantt |
| `GET` | `/planes/export/?anio=&trimestre=` | Informe trimestral Excel (descarga inmediata) |
| `GET/POST` | `/planes/informes/` | Historial / encolar informe seguimiento PDF (ver abajo) |
| `GET` | `/planes/informes/firmantes/` | Usuarios candidatos a firmar informe PDF |
| `GET` | `/planes/informes/{id}/download/` | Descarga PDF generado |
| `DELETE` | `/planes/informes/{id}/` | Elimina informe PDF y archivo en B2 |
| `POST` | `/planes/{id}/responsable/` | Asignar secretaría responsable |
| `GET/POST/PATCH/DELETE` | `/planes/actividades/` · `/{id}/` | CRUD actividades |
| `PATCH` | `/planes/actividades/{id}/responsable-usuario/` | Delegar contratista |
| `GET/POST/PUT/DELETE` | `/planes/actividades/{id}/evidencia/` | Evidencia multipart |

### Almacenamiento evidencias e informes

Ruta B2 evidencias (`softone-planes-612` en prod; `storage-demo` en demo):

```
entities/<entity_id>/planes/evidencias/<codigo_plan>/<anio>/T<trimestre>/<nombre_seguro>
```

Ruta B2 informes PDF seguimiento (mismo bucket):

```
informes/<entity_id>/seguimiento/informe_seguimiento_d612_<anio>_T<trimestre>_<timestamp>.pdf
```

- Máximo **5 archivos** por evidencia, **20 MB** c/u.
- Formatos: PDF, Word, Excel, PNG/JPG/WebP.
- URLs firmadas vía `files.softone360.com` (prod) o `files-demo.softone360.com` (demo).

### Activación

Superadmin → Entidad → Módulos: activar **Planes Institucionales** (`enable_planes_institucionales`).

Ruta frontend: `/planes` (Resumen · Planes · Cronograma · Informes).

Rutas de informes:

| Ruta | Descripción |
|---|---|
| `/planes/informes` | Lista de informes PDF generados + botón **Crear informe** (selector de tipo) |
| `/planes/informes/trimestral` | Informe trimestral (Excel): filtros y descarga inmediata |

### Informes Planes Institucionales

Pestaña **Informes** en el módulo Planes (roles `admin` y `secretario`; contratista **no** tiene acceso). Botón **Crear informe** con selector de tipo:

| Tipo | Formato | Comportamiento |
|---|---|---|
| **Informe de Seguimiento D612** | PDF | Generación **asíncrona** con Celery: membrete institucional, secciones legales, tablas por plan (6 columnas), gráficas de avance, resultados/conclusiones con IA opcional. Historial con retención **7 días**. |
| **Informe trimestral** | Excel | Descarga **inmediata** vía `GET /planes/export/`; no se guarda en servidor ni hay historial. |

Estructura del PDF de seguimiento (Decreto 612 / Control Interno): portada, introducción, objetivo, alcance, fecha de auditoría, criterios, tipo de auditoría, actividades desarrolladas por plan, resultados de la auditoría (IA o fallback), firma.

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/v1/planes/informes/?tipo=SEGUIMIENTO_D612` | Historial PDF (purga perezosa de expirados) |
| `POST` | `/api/v1/planes/informes/` | Encola generación PDF → `201`; `409` si ya hay uno del mismo tipo en cola/proceso |
| `GET` | `/api/v1/planes/informes/firmantes/` | Usuarios candidatos a firmar (`?secretaria_id=`) |
| `GET` | `/api/v1/planes/informes/{id}/download/` | Descarga PDF desde B2 (`B2_BUCKET_PLANES`) |
| `DELETE` | `/api/v1/planes/informes/{id}/` | Elimina registro y archivo en B2 |

**Body POST (PDF):** `tipo` (`SEGUIMIENTO_D612`), `anio`, `trimestre` (1–4, obligatorio), `plan_id` (opcional), `responsable_secretaria_id` (opcional; admin filtra dependencia), `usuario_firmante_id` (obligatorio), `cargo_firmante` (opcional), `incluir_evidencias` (default `true`), `usar_ia` (solo si `enable_ai_reports`).

**Tipos:** `SEGUIMIENTO_D612` = Informe de Seguimiento Decreto 612 (PDF).

**Roles:** `admin` puede filtrar por dependencia, plan o toda la entidad; `secretario` queda forzado a su secretaría. Retención **7 días** (`expires_at`); purga automática Celery Beat `03:50` (`purge_expired_informes_planes`) y al listar. Requiere `celery-worker` y `celery-beat` activos.

**Variables IA:**

```
PLANES_REPORTS_OPENAI_API_KEY=sk-...   # opcional; fallback PQRS_REPORTS / OPENAI
PLANES_REPORTS_OPENAI_MODEL=gpt-4o-mini   # opcional
```

**Demo:** agregar `PLANES_REPORTS_OPENAI_API_KEY` en `/opt/softone-demo/.env` y redeploy. Activar `enable_ai_reports` en la entidad para usar IA en conclusiones.

---

## Módulo Gestión documental (Ley 594 / Acuerdo AGN 001 de 2024)

SGDEA operativo por entidad: instrumentos archivísticos, clasificación TRD/CCD, expedientes electrónicos, inventario FUID, transferencias y disposición final. Complementa **Correspondencia** (radicación) y **Planes** (PINAR como plan Decreto 612); aquí se cargan los formatos oficiales AGN y la TRD estructurada.

### Marco normativo

- **Ley 594 de 2000:** PGD, TRD obligatoria, inventario documental.
- **Decreto 2609/2012 + 1080/2015:** CCD, TRD, TVD, FUID, SIC.
- **Acuerdo AGN 001 de 2024:** SGDEA, expediente electrónico, repositorio digital, convalidación → RUSD.

### Flujo

```
Superadmin activa módulo → Admin carga instrumentos (TRD, CCD, PGD…)
  └─→ Importa / define series TRD (retención, disposición CT/S/E/MD)
       └─→ Crea expedientes + documentos (B2)
            └─→ Genera FUID → Transferencias primaria/secundaria → Disposición
```

### Roles

| Rol | Permisos |
|---|---|
| `admin` | CRUD instrumentos, series, expedientes, FUID, transferencias, disposición, export Excel |
| `secretario` | Expedientes de su secretaría, instrumentos, series de su dependencia |
| `contratista` | Expedientes asignados, carga de documentos |
| `superadmin` | Activa `enable_gestion_documental`; no opera el módulo |

### Endpoints (`/api/v1/gestion-documental/`)

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/stats/` | KPIs: instrumentos, expedientes, procesos PGD, retención vencida |
| `GET/POST/PATCH/DELETE` | `/instrumentos/` | CRUD instrumentos archivísticos |
| `POST` | `/instrumentos/{id}/archivo/` | Subir PDF/Excel oficial (multipart) |
| `GET/POST/PATCH/DELETE` | `/unidades/` | Oficinas productoras |
| `GET/POST/PATCH/DELETE` | `/series/` | Series / subseries CCD-TRD |
| `POST` | `/series/importar/` | Importar Excel TRD |
| `GET/POST/PATCH/DELETE` | `/expedientes/` | CRUD expedientes |
| `POST` | `/expedientes/{id}/documentos/` | Subir documento al expediente |
| `POST` | `/expedientes/{id}/cerrar/` | Cerrar expediente |
| `GET/POST` | `/fuid/` | Inventario FUID |
| `POST` | `/fuid/generar-desde-expedientes/` | Generar filas FUID desde expedientes |
| `GET/POST` | `/transferencias/` | Transferencias primaria / secundaria |
| `POST` | `/transferencias/{id}/ejecutar/` | Ejecutar (cambia etapa archivística) |
| `GET/POST` | `/disposiciones/` | Registro disposición final |
| `GET` | `/export/?tipo=fuid\|trd\|transferencias` | Descarga Excel inmediata |

### Almacenamiento (B2)

| Entorno | Bucket |
|---|---|
| Demo | `storage-demo` (`B2_BUCKET_GESTION_DOCUMENTAL=storage-demo`) |
| Prod | `softone-document-management` |

Rutas:

```
entities/<entity_id>/gestion-documental/instrumentos/<instrumento_id>/<uuid>_<nombre>
entities/<entity_id>/gestion-documental/expedientes/<expediente_id>/<uuid>_<nombre>
```

URLs firmadas vía `files.softone360.com` (prod) o `files-demo.softone360.com` (demo).

### Activación

Superadmin → Entidad → Módulos: activar **Gestión documental** (`enable_gestion_documental`).

Ruta frontend: `/gestion-documental` (Resumen · Instrumentos · Clasificación · Expedientes · Inventario FUID · Transferencias · Informes).

**Demo:** disponible tras push a `development`. **Prod:** desplegar desde `main` (bucket `softone-document-management` + worker en `deploy/`).

---

## Módulo PIC — Plan de Intervenciones Colectivas

Seguimiento trimestral a actividades PIC cargadas desde Excel (`SEGUIMINETO A PIC.xlsx`): programación por trimestre, ejecución con evidencia PDF, valor a cobrar automático y asignación de responsables.

### Flujo

```
Admin activa módulo → configura mapeo cargo → usuario (Encargados)
  └─→ Carga Excel por vigencia (año)
       └─→ Actividades materializadas (número único por fila)
            └─→ Responsables asignados automáticamente desde mapeo
                 └─→ Funcionario registra ejecución + PDF
                      └─→ Valor a cobrar calculado (tope = total programado)
```

### Reglas de negocio

- `valor_unitario = valor_total / total_programado` (columna N del Excel se ignora).
- Valor a cobrar por ejecución: proporcional al acumulado para que la suma cierre con `valor_total`.
- No se puede ejecutar más del total programado.
- Trimestres acumulativos: pendiente = programado acumulado − ejecutado acumulado.
- Re-carga del Excel: upsert por `numero`; preserva ejecuciones y asignaciones manuales (opción `reasignar_encargados`).

### Roles

| Rol | Permisos |
|---|---|
| `admin` | Cargar Excel, mapeo de encargados, exportar, ver todo, eliminar ejecuciones |
| `secretario` | Ver actividades de su secretaría, exportar, eliminar ejecuciones |
| `contratista` | Ver actividades asignadas, registrar ejecución + PDF |
| `superadmin` | Activa `enable_pic`; no opera el módulo |

### Endpoints (`/api/v1/pic/`)

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/pic/plan/?anio=` | Plan PIC por vigencia |
| `POST` | `/pic/plan/upload/` | Cargar Excel (`file`, `anio`, opcional `reasignar_encargados`) |
| `DELETE` | `/pic/plan/<anio>/` | Eliminar plan sin ejecuciones |
| `GET` | `/pic/stats/?anio=` | Dashboard KPIs |
| `GET` | `/pic/actividades/` | Listar actividades (paginado) |
| `GET` | `/pic/actividades/<id>/` | Detalle + ejecuciones |
| `PATCH` | `/pic/actividades/<id>/responsables/` | Asignar responsables |
| `GET/POST` | `/pic/actividades/<id>/ejecuciones/` | Listar / registrar ejecución (multipart PDF) |
| `POST` | `/pic/actividades/<id>/preview-valor/` | Preview valor a cobrar |
| `DELETE` | `/pic/ejecuciones/<id>/` | Eliminar ejecución |
| `GET/POST/PATCH/DELETE` | `/pic/cargos/` | Mapeo cargo Excel → usuarios |
| `POST` | `/pic/cargos/aplicar/` | Reasignar en bloque `{anio}` |
| `GET` | `/pic/export/?anio=&trimestre=` | Excel seguimiento (descarga inmediata) |

### Almacenamiento evidencias (B2)

| Entorno | Bucket |
|---|---|
| Demo | `storage-demo` (`B2_BUCKET_PIC=storage-demo`) |
| Prod | `softone-pic` |

Ruta:

```
entities/<entity_id>/pic/<anio>/actividad-<numero>/T<trimestre>/<uuid>_<nombre>.pdf
```

URLs firmadas vía `files.softone360.com` (prod) o `files-demo.softone360.com` (demo).

### Activación

Superadmin → Entidad → Módulos: activar **PIC** (`enable_pic`).

Ruta frontend: `/pic` (Resumen · Actividades · Encargados).

**Demo:** push a `development`. Agregar `B2_BUCKET_PIC=storage-demo` en `/opt/softone-demo/.env`.

---

## Módulo Chat IA del PDM (público)

Chat ciudadano **sin autenticación** para consultar el Plan de Desarrollo Municipal de cada entidad en **tiempo real** (datos leídos directamente de PostgreSQL vía herramientas OpenAI). Un chat por entidad; solo responde sobre el PDM de esa entidad.

### Activación (superadmin)

En **Superadmin → Entidad → Módulos**, activar **Chat IA del PDM (público)** (`enable_pdm_chat`). Requiere que el módulo **PDM** (`enable_pdm`) también esté activo. Al guardar, se generan automáticamente el mensaje de bienvenida y preguntas sugeridas.

La sección **Chat IA del PDM** muestra:
- URL pública: `https://app.softone360.com/chat/{slug}`
- URL LAN: `http://{IP}:{LAN_HTTP_PORT}/chat/{slug}`
- Snippet de embed para sitios gov.co
- Analítica de preguntas (últimos 30 días)

### Rutas públicas

| Ruta | Descripción |
|---|---|
| `/chat/:slug` | Widget de chat (SPA React, modo `?embed=1` para iframe) |
| `/embed/pdm-chat.js` | Launcher JS (botón flotante + iframe) para gov.co |

### Endpoints API públicos

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/v1/public/entity/{slug}/pdm-chat/info/` | Info del chat (logo, intro, sugerencias) |
| `POST` | `/api/v1/public/entity/{slug}/pdm-chat/` | Enviar mensaje `{message, conversation_id?}` → `{reply, sources[]}` |

Rate-limit: `60/hour` por IP (`pdm_chat_public`).

### Analítica (autenticado)

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/v1/pdm/v2/{slug}/chat/analytics/` | Conversaciones, mensajes y últimas preguntas (30 días) |

Requiere rol `admin` de la entidad o `superadmin`.

### Embed en gov.co

```html
<script src="https://app.softone360.com/embed/pdm-chat.js" data-entity="slug-de-la-entidad"></script>
```

Opciones: `data-position="bottom-left"`, `data-color="#3eafd4"`, `data-base="https://app.softone360.com"`.

### Guardrails

- Solo responde sobre el PDM de la entidad del slug (rechaza otras entidades y módulos).
- Datos exclusivamente de herramientas read-only acotadas por `entity_id` (productos, ejecución, contratos, actividades, evidencias con URL externa, iniciativas SGR).
- Citación de fuentes: códigos de producto, BPIN (datos.gov.co), URLs de evidencia.
- Conversaciones registradas para analítica (IP hasheada, sin datos personales).

### Variables de entorno

```
PDM_CHAT_OPENAI_API_KEY=sk-...     # obligatoria — API key dedicada al chat PDM (separada de PQRS)
PDM_CHAT_MODEL=gpt-4o-mini         # opcional; por defecto usa OPENAI_MODEL
```

`OPENAI_API_KEY` sigue siendo **solo para PQRS** (auto-create). El chat PDM no la usa.

> **Seguridad:** nunca commits API keys al repositorio. Configúralas solo en `.env` del servidor.

---

## IA con OpenAI

La acción `POST /api/v1/pqrs/auto-create/` (y el portal público `/pqrs/auto/`) recibe texto libre y/o archivos y utiliza OpenAI para:

1. Extraer el texto de los documentos adjuntos (PDF → `pdfplumber`/`pypdf`, DOCX → `python-docx`).
2. Construir un prompt estructurado con los campos del modelo PQRS y la lista de secretarías activas de la entidad.
3. Llamar al modelo (`gpt-4o-mini` por defecto) con `response_format: json_object` y `temperature: 0.1`.
4. Normalizar y validar la respuesta.
5. Crear la PQRS y, si la IA detectó la secretaría correcta, asignarla automáticamente.

La opción **Automática / IA** en el formulario interno y en el portal público solo se muestra si la entidad tiene habilitado el módulo `enable_ai_reports` (Reportes con IA).

### Variables de entorno OpenAI

```
OPENAI_API_KEY=sk-...              # obligatoria para auto-create
OPENAI_MODEL=gpt-4o-mini         # opcional, default gpt-4o-mini
```

En producción el backend necesita salida a Internet hacia la API de OpenAI (la red `edge` del compose no es `internal`).

---

