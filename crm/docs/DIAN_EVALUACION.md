# Evaluación: facturación electrónica DIAN (Colombia)

SoftOne CRM hoy implementa **facturación comercial interna** (numeración por tenant, PDF, pagos y saldos). **No** genera XML UBL, CUFE/CUDE ni envío a la DIAN.

## Alcance típico de un proyecto DIAN

| Componente | Esfuerzo orientativo |
|------------|----------------------|
| Resolución de numeración y rangos autorizados | Legal + configuración en proveedor |
| XML UBL 2.1 / anexos técnicos vigentes | Alto (validación XSD, cambios normativos) |
| Firma digital del documento | Medio (certificado + HSM o proveedor) |
| Envío y acuse DIAN / correo al cliente | Medio |
| Notas crédito/débito, contingencia, reenvíos | Medio–alto |
| Proveedor tecnológico (PT) o integración directa | Contrato + API |

Estimación habitual: **varias semanas a meses**, según proveedor (Alegra, Siigo, Carvajal, Facturatech, etc.) vs desarrollo propio.

## Opciones recomendadas

1. **Mantener CRM como gestión comercial** y emitir factura electrónica en el ERP/contador del cliente (export CSV o API unidireccional).
2. **Integrar un PT vía API**: el CRM crea borrador comercial; al “emitir” se llama al PT que devuelve CUFE, PDF oficial y estado DIAN.
3. **Desarrollo propio ante la DIAN**: solo si hay equipo fiscal y de compliance dedicado; costo de mantenimiento normativo alto.

## Datos que el CRM ya tiene (útiles para DIAN)

- Empresa: NIT, razón social, dirección, contacto, logo.
- Cliente: tipo y número de documento, razón social.
- Líneas: descripción, cantidad, precio, IVA por línea, totales.
- Consecutivos por tenant (`prefijo_factura`, modelo `Consecutivo`).

## Gaps principales respecto a compliance

- Tipos de identificación y responsabilidades fiscales del adquirente (RUT / régimen).
- Códigos DIAN de producto, unidad de medida, medios de pago estándar.
- Retenciones, INC, autoretenedores, moneda extranjera.
- Numeración **autorizada** distinta del consecutivo interno actual.
- Almacenamiento legal del XML firmado y trazabilidad de eventos.

## Recomendación SoftOne

Antes de desarrollar en el CRM, **definir con el cliente**:

- ¿Factura electrónica es requisito legal desde el día uno?
- ¿Qué proveedor ya usa (contador, Siigo, Alegra)?
- ¿El CRM debe ser sistema **fuente de verdad** o solo **prefactura**?

Si la respuesta es compliance completo, presupuestar un **hitos aparte** con proveedor PT seleccionado; reutilizar el flujo actual `borrador → emitida` como gancho para disparar la emisión electrónica externa.

## Próximo paso técnico (cuando se apruebe)

- Elegir PT y leer API de emisión.
- Añadir campos fiscales en `Empresa` y `Cliente`.
- Tabla `FacturaElectronica` (cufe, xml_url, estado_dian, payload_json).
- Webhook del PT para actualizar estado en el CRM.
