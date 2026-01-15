//backend/src/index.js
require("./database/database.js");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const Practica = require("./database/models/Practica.js");
const Comprobante = require("./database/models/Comprobante.js");
const AfipService = require("./AfipService.js");
const path = require("path");
const { chromium } = require("playwright");
const fs = require("fs");
const qr = require("qr-image");
const { print } = require("pdf-to-printer");
const ExcelJS = require("exceljs");

const CUIT = 30712465871;

const afipService = new AfipService({ CUIT });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

// Define la carpeta desde donde se servirán los archivos
const directoryPath = path.join(__dirname, "comprobantes");
app.use(express.static(directoryPath));

async function crearPDF({
    copia,
    codigoComprobante, // 6 factura B, 8 nota crédito B, etc.
    tituloComprobante, // "FACTURA" / "NOTA DE CRÉDITO"
    numeroComprobante,
    docNro,
    condIva,
    nombre,
    domicilio,
    practicas,
    importe_total,
    importe_gravado,
    importe_iva,
    CAE,
    vtoCAE,
}) {
    const style = `
    <style>
      .container {
        margin-left: 9px;
        width: 20cm;
        height: 14.01cm;
        border: 1px solid;
        position: relative;
    }
    
    .cajaOriginal {
        position: relative;
        border-bottom: 1px solid;
        width: 20cm;
        height: 0.5cm;
    }
    
    .cajaGrande {
        border-bottom: 1px solid;
        width: 20cm;
        height: 4cm;
        position: relative;
    }
    
    .cajaB {
        width: 1.5cm;
        height: 1.5cm;
        border: 1px solid;
        border-top: 0;
        position: absolute;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        top: 1cm;
        left: calc(51% - 1cm);
        transform: translateY(-66%);
    }
    
    .lineaDivisoria {
        height: 2.505cm;
        border-right: 1px solid;
        border-top: 0;
        position: absolute;
        left: calc(54.88% - 1cm);
        transform: translateY(60%);
    }
    
    .contenidoCajaGrande {
        display: flex;
    }
    
    .cajaDiseño {
        width: 10cm;
        height: 4cm;
        display: flex;
        flex-direction: column;
        justify-content: space-around;
    }
    
    .cajaFactura {
        width: 10cm;
        height: 4cm;
    }
    
    .b {
        font-size: 30px;
        font-weight: bold;
    }
    
    .original {
        font-weight: bold;
        text-align: center;
        padding-top: 1px;
    }
    
    .titulo {
        font-weight: bold;
        font-size: 25px;
        text-align: center;
        color: rgb(35, 35, 129);
    }
    
    .infoDiseño {
        margin-left: 8px;
        font-size: 13px;
        font-weight: bold;
    }
    
    .cod {
        font-size: 10px;
        font-weight: bold;
    }
    
    .factura {
        font-weight: bold;
        font-size: 25px;
        margin-left: 50px;
        margin-top: 12px;
    }
    
    .nroOrden {
        display: flex;
    }
    
    .nroFactura {
        margin-left: 16px;
        margin-top: 10px;
        display: flex;
        justify-content: space-evenly;
        font-weight: bold;
        font-size: 13px;
    }
    
    .datosAFIP {
        font-size: 13px;
        font-weight: bold;
        margin-top: 4px;
        margin-left: 50px;
    }
    
    .flexInfoDiseño {
        display: flex;
        font-size: 13px;
    }
    
    .infoDiseñoDatos {
        margin-left: 7px;
    }
    
    .nroDatos {
        margin-left: 7px;
        font-size: 14px;
    }
    
    .contenedorDatosAFIP {
        display: flex;
    }
    
    .infoFecha {
        margin-left: 7px;
        font-size: 14px;
    }
    
    .datosAFIPcontenido {
        font-size: 13px;
        margin-top: 4px;
        margin-left: 7px;
    }
    
    .cajaCliente {
        margin-top: 2px;
        border-top: 1px solid;
        border-bottom: 1px solid;
        height: 2cm;
        font-size: 13px;
        display: flex;
    }
    
    .grupo1 {
        width: 8cm;
        padding-left: 8px;
        display: flex;
        flex-direction: column;
        justify-content: space-around;
    }
    
    .grupo2 {
        width: 12cm;
        height: 2cm;
        display: flex;
        flex-direction: column;
        justify-content: space-around;
        padding-right: 8px;
    }
    
    .tituloCliente {
        font-weight: bold;
    }
    
    .cliente {
        display: flex;
    }
    
    .contenidoCliente {
        font-size: 13px;
        margin-left: 7px;
    }
    
    .descripcion {
        width: 12cm;
        font-size: 13px;
    }
    
    .subtotales {
        width: 4cm;
        font-size: 13px;
    }
    
    th {
        border: 1px solid;
        border-bottom: 1px solid;
        background-color: rgb(232, 232, 232);
    }
    
    td {
        font-size: 14px;
    }
    
    .tdDescripcion {
        padding-left: 15px;
    }
    
    .tdSubtotales {
        text-align: center;
    }
    
    .tabla {
        height: 4.3cm;
        border-bottom: 1px solid;
        position: relative;
    }
    
    .contenedorFooter {
        height: 114px;
        display: flex;
    }
    
    .divQR {
        padding-left: 1px;
        width: 10cm;
        display: flex;
        align-items: center;
    }
    
    .divTotal {
        width: 10cm;
        display: flex;
        align-items: center;
    }
    
    .qr {
        width: 30%;
    }
    
    .CAE {
        font-size: 13px;
        font-weight: bold;
        padding-bottom: 7px;
        padding-top: 7px;
        padding-left: 7px;
    }
    
    .comprobanteAutorizado {
        font-size: 15px;
        font-style: italic;
    }
    
    .contenedorCAE {
        display: flex;
    }
    
    .infoCAE {
        font-size: 13px;
        padding-bottom: 7px;
        padding-top: 7px;
        padding-left: 7px;
    }
    
    .importeTitulo {
        font-size: 14px;
        font-weight: bold;
        padding-top: 7px;
        padding-bottom: 7px;
    }
    
    .flexImporte {
        display: flex;
    }
    
    .infoImporte {
        font-size: 14px;
        padding-top: 7px;
        padding-bottom: 7px;
        padding-left: 10px;
        font-weight: bolder;
    }
    
    .grupoTitulos {
        text-align: right;
        padding-left: 2.6cm;
    }
    </style>`;

    const letra = codigoComprobante === 6 || codigoComprobante === 8 ? "B" : "A";

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
        ${style}
    </head>
    <body>
      <div class="container">
          <div class="cajaOriginal">
              <div class="original">${copia}</div>
          </div>

          <div class="cajaGrande">
              <div class="cajaB">
                  <div class="b">${letra}</div>
                  <div class="cod">COD. 00${codigoComprobante}</div>
              </div>
              <div class="lineaDivisoria"></div>

              <div class="contenidoCajaGrande">
                  <div class="cajaDiseño">
                      <div class="titulo">RX CONSULTORIO <br> 11 de Abril 130</div>
                      <div class="flexInfoDiseño">
                          <div class="infoDiseño">Razón Social:</div>
                          <div class="infoDiseñoDatos">GIRAUDO Y MAS S.A.</div>
                      </div>
                      <div class="flexInfoDiseño">
                          <div class="infoDiseño">Domicilio Comercial:</div>
                          <div class="infoDiseñoDatos">11 de abril 130 - Bahia Blanca, Buenos Aires</div>
                      </div>
                      <div class="infoDiseño">Condición frente al IVA:&nbsp; &nbsp;IVA Responsable Inscripto</div>
                  </div>

                  <div class="cajaFactura">
                      <div class="factura">${tituloComprobante}</div>
                      <div class="nroFactura">
                          <div class="nroOrden">
                              <div>Punto de Venta:</div>
                              <div class="nroDatos">00002</div>
                          </div>
                          <div class="nroOrden">
                              <div>Comp. Nro:</div>
                              <div class="nroDatos">${numeroComprobante.toString().padStart(8, "0")}</div>
                          </div>
                      </div>

                      <div class="contenedorDatosAFIP datosAFIP">
                          <div>Fecha de Emisión:</div>
                          <div class="infoFecha">${new Date().toLocaleDateString()}</div>
                      </div>

                      <div class="contenedorDatosAFIP">
                          <div class="datosAFIP">CUIT:</div>
                          <div class="datosAFIPcontenido">30-71246587-1</div>
                      </div>
                      <div class="contenedorDatosAFIP">
                          <div class="datosAFIP">Ingresos Brutos:</div>
                          <div class="datosAFIPcontenido">30-71246587-1</div>
                      </div>
                      <div class="contenedorDatosAFIP">
                          <div class="datosAFIP">Fecha de Inicio de Actividades:</div>
                          <div class="datosAFIPcontenido">11/2012</div>
                      </div>
                  </div>
              </div>
          </div>

          <div class="cajaCliente">
              <div class="grupo1">
                  <div class="cliente">
                      <div class="tituloCliente">CUIT/DNI:</div>
                      <div class="contenidoCliente">${docNro === 0 ? "" : docNro}</div>
                  </div>
                  <div class="cliente">
                      <div class="tituloCliente">Condición frente al IVA:</div>
                      <div class="contenidoCliente">${condIva}</div>
                    </div>
                </div>
                <div class="grupo2">
                    <div class="cliente">
                        <div class="tituloCliente">Apellido y Nombre / Razón Social:</div>
                        <div class="contenidoCliente">${nombre}</div>
                  </div>
                  <div class="cliente">
                      <div class="tituloCliente">Domicilio:</div>
                      <div class="contenidoCliente">${domicilio ? domicilio : ""}</div>
                  </div>
              </div>
          </div>

          <div class="tabla">
              <table>
                  <thead>
                      <tr>
                          <th class="descripcion">Descripción</th>
                          <th class="subtotales">${codigoComprobante == 6 || codigoComprobante == 8 ? "" : "Subtotal"}</th>
                          <th class="subtotales">${codigoComprobante == 6 || codigoComprobante == 8 ? "Subtotal" : "Subtotal C/IVA"}</th>
                      </tr>
                  </thead>
                  <tbody>
                    ${practicas
            ?.map(
                (prac) => `
                      <tr>
                        <td class="tdDescripcion">${prac.cantidad} x ${prac.label}</td>
                        <td class="tdSubtotales">${codigoComprobante == 6 || codigoComprobante == 8
                        ? ""
                        : `$${(prac.total / 1.21).toLocaleString("es-AR")}`
                    }</td>
                        <td class="tdSubtotales">$${prac.total.toLocaleString("es-AR")}</td>
                      </tr>`
            )
            .join("")}
                  </tbody>
              </table>
          </div>

          <div class="contenedorFooter">
              <div class="divQR">
                  <img class="qr" src="./images/qr-afip.png" alt="">
                  <div>
                      <div class="CAE comprobanteAutorizado">Comprobante Autorizado</div>
                      <div class="contenedorCAE">
                          <div class="CAE">CAE:</div>
                          <div class="infoCAE">${CAE}</div>
                      </div>
                      <div class="contenedorCAE">
                          <div class="CAE">Vencimiento CAE:</div>
                          <div class="infoCAE">${vtoCAE}</div>
                      </div>
                  </div>
              </div>

              <div class="divTotal">
                  <div class="grupoTitulos">
                      <div class="importeTitulo">${codigoComprobante == 6 || codigoComprobante == 8 ? "Subtotal" : "Importe Neto Gravado:"
        }</div>
                      <div class="importeTitulo">${codigoComprobante == 6 || codigoComprobante == 8 ? "" : "IVA 21%:"}</div>
                      <div class="importeTitulo">Importe Total:</div>
                  </div>
                  <div>
                      <div class="infoImporte">$${(codigoComprobante == 6 || codigoComprobante == 8
            ? parseFloat(importe_total)
            : parseFloat(importe_gravado)
        ).toLocaleString("es-AR")}</div>

                      <div class="infoImporte">${codigoComprobante == 6 || codigoComprobante == 8
            ? ""
            : `$${parseFloat(importe_iva).toLocaleString("es-AR")}`
        }</div>

                      <div class="infoImporte">$${parseFloat(importe_total).toLocaleString("es-AR")}</div>
                  </div>
              </div>
          </div>
      </div>
    </body>
    </html>`;

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    fs.writeFileSync(path.join(__dirname, "index.html"), htmlContent);
    const htmlPath = path.join(__dirname, "index.html");
    await page.goto(htmlPath);

    const prefijo = codigoComprobante === 8 || codigoComprobante === 3 ? "NC" : "F";
    const comprobanteNombre = `${prefijo}${letra}-${numeroComprobante}-${copia === "ORIGINAL" ? "O" : "D"}.pdf`;
    const pathPDF = path.join(__dirname, "comprobantes", comprobanteNombre);

    await page.pdf({
        path: pathPDF,
        format: "A4",
        printBackground: true,
    });

    await browser.close();

    if (copia === "DUPLICADO") {
        await print(pathPDF);
    }

    return comprobanteNombre;
}

io.on("connection", (socket) => {
    socket.on("guardar-practica", async (practica) => {
        if (practica._id) {
            await Practica.findByIdAndUpdate(practica._id, practica);
        } else {
            await Practica.create(practica);
        }
        io.emit("cambios");
    });

    socket.on("request-practicas", async () => {
        const practicas = await Practica.find().sort({ createdAt: -1 });
        socket.emit("response-practicas", practicas);
    });

    socket.on("facturar", async (practicas, datos, callback) => {
        try {
            datos.practicas = practicas;
            datos.total = 0;
            datos.practicas?.forEach((pr) => {
                datos.total += pr.total;
            });

            if (datos.condicion === "CONSUMIDOR FINAL" || datos.condicion === "IVA EXENTO") {
                if (datos.numDoc === "") {
                    datos.numDoc = 0;
                }

                let response = await afipService.facturaB(datos.total, datos.numDoc, datos.condicion);

                if (response.CAE && response.vtoCAE) {
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = (today.getMonth() + 1).toString().padStart(2, "0");
                    const day = today.getDate().toString().padStart(2, "0");
                    let formattedDateString = year + "-" + month + "-" + day;

                    let object = {
                        ver: 1,
                        fecha: formattedDateString,
                        cuit: CUIT,
                        ptoVta: 2,
                        tipoCmp: 6,
                        nroCmp: response.numeroComprobante,
                        importe: parseFloat(response.importe_total),
                        moneda: "PES",
                        ctz: 1,
                        tipoDocRec: response.docTipo,
                        nroDocRec: parseFloat(datos.numDoc),
                        tipoCodAut: "E",
                        codAut: parseInt(response.CAE),
                    };

                    const jsonString = JSON.stringify(object);
                    const buffer = Buffer.from(jsonString, "utf-8");
                    const base64String = buffer.toString("base64");

                    let qr_svg = qr.image(
                        `https://serviciosweb.afip.gob.ar/genericos/comprobantes/cae.aspx?p=${base64String}`,
                        { type: "png" }
                    );
                    qr_svg.pipe(fs.createWriteStream(path.join(__dirname, "images", "qr-afip.png")));

                    try {
                        datos.pathO = await crearPDF({
                            copia: "ORIGINAL",
                            codigoComprobante: 6,
                            tituloComprobante: "FACTURA",
                            numeroComprobante: response.numeroComprobante,
                            docNro: datos.numDoc,
                            condIva: datos.condicion,
                            nombre: datos.nombre,
                            domicilio: datos.domicilio,
                            practicas: datos.practicas,
                            importe_total: response.importe_total,
                            importe_gravado: response.importe_gravado,
                            importe_iva: response.importe_iva,
                            CAE: response.CAE,
                            vtoCAE: response.vtoCAE,
                        });

                        datos.pathD = await crearPDF({
                            copia: "DUPLICADO",
                            codigoComprobante: 6,
                            tituloComprobante: "FACTURA",
                            numeroComprobante: response.numeroComprobante,
                            docNro: datos.numDoc,
                            condIva: datos.condicion,
                            nombre: datos.nombre,
                            domicilio: datos.domicilio,
                            practicas: datos.practicas,
                            importe_total: response.importe_total,
                            importe_gravado: response.importe_gravado,
                            importe_iva: response.importe_iva,
                            CAE: response.CAE,
                            vtoCAE: response.vtoCAE,
                        });
                    } catch (error) {
                        console.log(error);
                    }

                    datos.cae = response.CAE;
                    datos.vtoCAE = response.vtoCAE;

                    // ✅ NUEVO: guardar info AFIP
                    datos.cbteTipo = 6;
                    datos.nroCmp = response.numeroComprobante;
                    datos.esNotaCredito = false;
                    datos.facturaAsociadaId = null;

                    await Comprobante.create(datos);
                    callback({ status: "ok", message: "Comprobante generado correctamente" });
                } else {
                    callback({
                        status: "error",
                        message: "No se pudo generar CAE y vtoCAE, comunicarse con Mas Damian",
                    });
                }
            } else if (datos.condicion === "RESPONSABLE INSCRIPTO" || datos.condicion === "MONOTRIBUTO") {
                // FACTURA A (pendiente)
            }
        } catch (error) {
            // silencioso como estaba
        }
    });

    socket.on("request-persona", async (numDoc) => {
        try {
            const data = await afipService.getPersona(numDoc);
            let condIva = "CONSUMIDOR FINAL";

            const nombreCompleto =
                (data.personaReturn.datosGenerales.apellido || "") +
                " " +
                (data.personaReturn.datosGenerales.nombre || "");

            const nombre = nombreCompleto.trim()
                ? nombreCompleto
                : data.personaReturn.datosGenerales.razonSocial;

            if (data.personaReturn.hasOwnProperty("datosMonotributo")) {
                condIva = "MONOTRIBUTO";
            } else if (data.personaReturn.hasOwnProperty("datosRegimenGeneral")) {
                for (impuesto of data.personaReturn.datosRegimenGeneral.impuesto) {
                    if (impuesto.descripcionImpuesto === "IVA") {
                        condIva = "RESPONSABLE INSCRIPTO";
                    } else if (impuesto.descripcionImpuesto === "IVA EXENTO") {
                        condIva = "IVA EXENTO";
                    }
                }
            }

            const info = {
                nombre: nombre,
                domicilio:
                    data.personaReturn.datosGenerales.domicilioFiscal.direccion +
                    ", " +
                    data.personaReturn.datosGenerales.domicilioFiscal.localidad +
                    ", " +
                    data.personaReturn.datosGenerales.domicilioFiscal.descripcionProvincia,
                condicion: condIva,
            };

            socket.emit("response-persona", info);
        } catch (error) {
            console.log(error);
        }
    });

    socket.on("borrar-practica", async (id) => {
        await Practica.findByIdAndDelete(id);
        io.emit("cambios");
    });

    socket.on("request-comprobantes", async () => {
        const comprobantes = await Comprobante.find().sort({ createdAt: -1 });
        socket.emit("response-comprobantes", comprobantes);
    });

    socket.on("filter-comprobantes", async ({ startDate, endDate }) => {
        const query = {};

        if (startDate && endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: new Date(startDate), $lte: endOfDay };
        } else if (startDate) {
            query.createdAt = { $gte: new Date(startDate) };
        } else if (endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            query.createdAt = { $lte: endOfDay };
        }

        const comprobantes = await Comprobante.find(query).sort({ createdAt: -1 });
        socket.emit("response-comprobantes", comprobantes);
    });

    // ✅ NUEVO: Generar Nota de Crédito desde una factura existente
    socket.on("nota-credito", async ({ comprobanteId }, callback) => {
        try {
            const factura = await Comprobante.findById(comprobanteId);

            if (!factura) return callback?.({ status: "error", message: "Factura no encontrada" });
            if (factura.esNotaCredito) return callback?.({ status: "error", message: "Ese comprobante ya es una nota de crédito" });
            if (factura.cbteTipo !== 6) return callback?.({ status: "error", message: "Por ahora solo se soporta Nota de Crédito para Factura B" });

            const docNro = factura.numDoc ? Number(factura.numDoc) : 0;
            const facturaNumero = factura.nroCmp; // ✅ número original AFIP
            const monto = factura.total;

            if (!facturaNumero) {
                return callback?.({
                    status: "error",
                    message: "La factura no tiene nroCmp guardado (solo funciona para facturas nuevas con esta actualización).",
                });
            }

            const response = await afipService.notaCreditoB(monto, docNro, facturaNumero);

            if (!response?.CAE || !response?.vtoCAE) {
                return callback?.({ status: "error", message: "No se pudo generar CAE/vtoCAE para la Nota de Crédito" });
            }

            // QR AFIP
            const today = new Date();
            const year = today.getFullYear();
            const month = (today.getMonth() + 1).toString().padStart(2, "0");
            const day = today.getDate().toString().padStart(2, "0");
            const formattedDateString = `${year}-${month}-${day}`;

            const object = {
                ver: 1,
                fecha: formattedDateString,
                cuit: CUIT,
                ptoVta: 2,
                tipoCmp: 8,
                nroCmp: response.numeroComprobante,
                importe: parseFloat(monto),
                moneda: "PES",
                ctz: 1,
                tipoDocRec: response.docTipo,
                nroDocRec: docNro,
                tipoCodAut: "E",
                codAut: parseInt(response.CAE),
            };

            const base64String = Buffer.from(JSON.stringify(object), "utf-8").toString("base64");

            let qr_svg = qr.image(
                `https://serviciosweb.afip.gob.ar/genericos/comprobantes/cae.aspx?p=${base64String}`,
                { type: "png" }
            );
            qr_svg.pipe(fs.createWriteStream(path.join(__dirname, "images", "qr-afip.png")));

            const importe_gravado = parseFloat((monto / 1.21).toFixed(2));
            const importe_iva = parseFloat((monto - importe_gravado).toFixed(2));

            const pathO = await crearPDF({
                copia: "ORIGINAL",
                codigoComprobante: 8,
                tituloComprobante: "NOTA DE CRÉDITO",
                numeroComprobante: response.numeroComprobante,
                docNro,
                condIva: factura.condicion,
                nombre: factura.nombre,
                domicilio: factura.domicilio,
                practicas: factura.practicas,
                importe_total: monto,
                importe_gravado,
                importe_iva,
                CAE: response.CAE,
                vtoCAE: response.vtoCAE,
            });

            const pathD = await crearPDF({
                copia: "DUPLICADO",
                codigoComprobante: 8,
                tituloComprobante: "NOTA DE CRÉDITO",
                numeroComprobante: response.numeroComprobante,
                docNro,
                condIva: factura.condicion,
                nombre: factura.nombre,
                domicilio: factura.domicilio,
                practicas: factura.practicas,
                importe_total: monto,
                importe_gravado,
                importe_iva,
                CAE: response.CAE,
                vtoCAE: response.vtoCAE,
            });

            await Comprobante.create({
                tipoDoc: factura.tipoDoc,
                numDoc: factura.numDoc,
                nombre: factura.nombre,
                medio: factura.medio,
                condicion: factura.condicion,
                domicilio: factura.domicilio,
                telefono: factura.telefono,
                mypymes: factura.mypymes,
                practicas: factura.practicas,
                total: factura.total,

                pathO,
                pathD,
                cae: response.CAE,
                vtoCAE: response.vtoCAE,

                cbteTipo: 8,
                nroCmp: response.numeroComprobante,

                esNotaCredito: true,
                facturaAsociadaId: factura._id,
            });

            io.emit("cambios");
            callback?.({ status: "ok", message: "Nota de crédito generada correctamente" });
        } catch (err) {
            console.error("Error en nota-credito:", err);
            callback?.({ status: "error", message: "Error generando nota de crédito" });
        }
    });
});

// Exportar comprobantes a Excel
app.get("/export-comprobantes", async (req, res) => {
    const { startDate, endDate } = req.query;
    const query = {};

    if (startDate && endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.createdAt = { $gte: new Date(startDate), $lte: endOfDay };
    } else if (startDate) {
        query.createdAt = { $gte: new Date(startDate) };
    } else if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.createdAt = { $lte: endOfDay };
    }

    const comprobantes = await Comprobante.find(query).sort({ createdAt: 1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Comprobantes");

    worksheet.columns = [
        { header: "Fecha", key: "createdAt", width: 20 },
        { header: "Comprobante", key: "pathO", width: 30 },
        { header: "Cliente", key: "nombre", width: 30 },
        { header: "Documento", key: "numDoc", width: 20 },
        { header: "Medio de Pago", key: "medio", width: 20 },
        { header: "Total", key: "total", width: 15 },
    ];

    comprobantes.forEach((comp) => {
        worksheet.addRow({
            createdAt: new Date(comp.createdAt).toLocaleDateString(),
            pathO: comp.pathO.replace("-O.pdf", ""),
            nombre: comp.nombre,
            numDoc: comp.numDoc,
            medio: comp.medio,
            total: comp.total,
        });
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=comprobantes.xlsx");

    await workbook.xlsx.write(res);
    res.end();
});

// Frontend dist
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));
app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});