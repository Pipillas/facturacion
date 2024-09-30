require("./database/database.js");
const express = require('express');
const http = require("http");
const { Server } = require("socket.io");
const Practica = require("./database/models/Practica.js");
const Comprobante = require("./database/models/Comprobante.js");
const AfipService = require("./AfipService.js");
const path = require("path");
const { chromium } = require('playwright');
const fs = require('fs');
const qr = require('qr-image');

const CUIT = 30712465871;

const afipService = new AfipService({ CUIT });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Cambia esto si usas un dominio diferente
        methods: ["GET", "POST"],
    },
});

// Define la carpeta desde donde se servirán los archivos
const directoryPath = path.join(__dirname, 'comprobantes');

// Usa el middleware express.static para servir archivos de la carpeta
app.use(express.static(directoryPath));

async function crearPDF(copia, codigoFactura, numeroComprobante, docNro, condIva, nombre, domicilio, practicas, importe_total, importe_gravado, importe_iva, CAE, vtoCAE) {
    const style = `
    <style>
      .container {
        margin-left: 9px;
        /* margin-top: 2px; */
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
                  <div class="b">${codigoFactura === 6 ? "B" : "A"}</div>
                  <div class="cod">COD. 00${codigoFactura}</div>
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
                      <div class="factura">FACTURA</div>
                      <div class="nroFactura">
                          <div class="nroOrden">
                              <div>Punto de Venta:</div>
                              <div class="nroDatos">00002</div>
                          </div>
                          <div class="nroOrden">
                              <div>Comp. Nro:</div>
                              <div class="nroDatos">${numeroComprobante
            .toString()
            .padStart(8, "0")}</div>
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
                      <div class="contenidoCliente">${docNro === 0 ? "" : docNro
        }</div>
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
                      <div class="contenidoCliente">${domicilio ? domicilio : ''}</div>
                  </div>
              </div>
          </div>
          <div class="tabla">
              <table>
                  <thead>
                      <tr>
                          <th class="descripcion">Descripción</th>
                          <th class="subtotales">${codigoFactura == 6 ? "" : "Subtotal"}</th>
                          <th class="subtotales">${codigoFactura == 6 ? "Subtotal" : "Subtotal C/IVA"}</th>
                      </tr>
                  </thead>
                    <tbody>
                    ${practicas?.map((prac) => `
                      <tr>
                         <td class="tdDescripcion"> ${prac.cantidad} x ${prac.label}</td>
                        <td class="tdSubtotales">${codigoFactura == 6 ? "" : `$${(prac.total / 1.21).toLocaleString('es-AR')}`}</td>
             <td class="tdSubtotales">$${prac.total.toLocaleString('es-AR')}</td>
    </tr>`).join('')}
</tbody>
              </table>
          </div>
          <div class="contenedorFooter">
              <div class="divQR">
                  <img class="qr" src="./images/qr-afip.png" alt="">
                  <div>
                      <div class="CAE comprobanteAutorizado">Comprobante Autorizado</div>
                      <div class="contenedorCAE">
                          <div class="CAE">
                              CAE:
                          </div>
                          <div class="infoCAE">
                              ${CAE}
                          </div>
                      </div>
                      <div class="contenedorCAE">
                          <div class="CAE">
                              Vencimiento CAE:
                          </div>
                          <div class="infoCAE">
                              ${vtoCAE}
                          </div>
                      </div>
                  </div>
              </div>
              <div class="divTotal">
                  <div class="grupoTitulos">
                      <div class="importeTitulo">${codigoFactura == 6
            ? "Subtotal"
            : "Importe Neto Gravado:"
        }</div>
                      <div class="importeTitulo">${codigoFactura == 6 ? "" : "IVA 21%:"
        }</div>
                      <div class="importeTitulo">Importe Total:</div>
                  </div>
                  <div>
                      <div class="infoImporte">$${codigoFactura == 6 ? parseFloat(importe_total).toLocaleString('es-AR') : parseFloat(importe_gravado).toLocaleString('es-AR')
        }</div>
                      <div class="infoImporte">${codigoFactura == 6 ? "" : `$${parseFloat(importe_iva).toLocaleString('es-AR')}`
        }</div>
                      <div class="infoImporte">$${parseFloat(importe_total).toLocaleString('es-AR')}</div>
                  </div>
              </div>
          </div>
      </div>
  
  </body>
  
    </html>`;
    const browser = await chromium.launch({ headless: true }); // Headless true para no mostrar el navegador
    const page = await browser.newPage();
    fs.writeFileSync(path.join(__dirname, 'index.html'), htmlContent);
    const htmlPath = path.join(__dirname, 'index.html');
    await page.goto(htmlPath);
    const comprobanteNombre = `F${codigoFactura === 6 ? "B" : "A"}-${numeroComprobante}-${copia === "ORIGINAL" ? "O" : "D"}.pdf`;
    const pathPDF = path.join(__dirname, 'comprobantes', comprobanteNombre);
    await page.pdf({
        path: pathPDF,
        format: "A4",
        printBackground: true,
    });
    await browser.close();
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
    socket.on("facturar", async (practicas, datos) => {
        datos.practicas = practicas;
        datos.total = 0;
        datos.practicas?.forEach((pr) => {
            datos.total += pr.total;
        });
        if (datos.condicion === "CONSUMIDOR FINAL" || datos.condicion === "IVA EXENTO") {
            if (datos.numDoc === "") {
                datos.numDoc = 0;
            }
            let response = await afipService.facturaB(datos.total, datos.numDoc);
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
            qr_svg.pipe(fs.createWriteStream(path.join(__dirname, 'images', 'qr-afip.png')));
            datos.pathO = await crearPDF('ORIGINAL', 6, response.numeroComprobante, datos.numDoc, datos.condicion, datos.nombre, datos.domicilio, datos.practicas, response.importe_total, response.importe_gravado, response.importe_iva, response.CAE, response.vtoCAE);
            datos.pathD = await crearPDF('DUPLICADO', 6, response.numeroComprobante, datos.numDoc, datos.condicion, datos.nombre, datos.domicilio, datos.practicas, response.importe_total, response.importe_gravado, response.importe_iva, response.CAE, response.vtoCAE);
            await Comprobante.create(datos);
            //FACTURA B
        } else if (
            datos.condicion === "RESPONSABLE INSCRIPTO" ||
            datos.condicion === "MONOTRIBUTO"
        ) {
            //let response = await afipService.facturaA(datos.total, datos.numDoc);
            //FACTURA A
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
                    data.personaReturn.datosGenerales.domicilioFiscal
                        .descripcionProvincia,
                condicion: condIva,
            };
            socket.emit("response-persona", info); // Emitir `info` en lugar de `data`
        } catch (error) {
            console.log(error);
        }
    });
    socket.on('borrar-practica', async (id) => {
        await Practica.findByIdAndDelete(id);
        io.emit('cambios');
    });
    socket.on('request-comprobantes', async () => {
        const comprobantes = await Comprobante.find().sort({ createdAt: -1 });
        socket.emit('response-comprobantes', comprobantes);
    });
});

// Sirve los archivos estáticos desde la carpeta dist (compilada por Vite)
const distPath = path.join(__dirname, "dist");
// Maneja todas las rutas del frontend para que Vite las gestione
app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
});

const PORT = 3000;
// Iniciar el servidor
server.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
