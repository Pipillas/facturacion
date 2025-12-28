const path = require('path');
const fs = require('fs');
const { Wsaa, Wsfe, Wspci } = require('afipjs');

class AfipService {

    constructor({ CUIT }) {

        this.CUIT = CUIT;

        this.conf = {
            prod: true,
            debug: false,
        };

        this.pem = fs.readFileSync(path.join(__dirname, 'cert', 'giraudo.crt'), 'utf8');
        this.key = fs.readFileSync(path.join(__dirname, 'cert', 'giraudo.key'), 'utf8');

        this.wsfe = null;
        this.wspci = null;

        this.pago_efectivo = 172244;
        this.pago_electronico = 344488;

        this.ptoVta = 2;
    }

    async initWsfe() {
        const taFile = path.join(__dirname, 'wsfe_ta.xml');
        const wsaaFe = new Wsaa(this.conf);
        wsaaFe.setCertificate(this.pem);
        wsaaFe.setKey(this.key);

        if (!this.wsfe) {
            // Si this.wsfe no está inicializado, obtenemos el TA
            const ta = await this.getValidTA(wsaaFe, "wsfe");
            this.wsfe = new Wsfe(ta, this.conf);
        } else {
            try {
                // Verificamos si el TA almacenado es válido
                const storedTA = wsaaFe.createTAFromString(fs.readFileSync(taFile, 'utf8'));
                if (!storedTA.isValid()) {
                    // Si el TA no es válido, obtenemos uno nuevo
                    const newTA = await this.getValidTA(wsaaFe, "wsfe");
                    this.wsfe = new Wsfe(newTA, this.conf);
                } else {
                    console.log('El TA almacenado es válido.');
                }
            } catch (error) {
                // Si hay un error al leer el archivo o el TA no es válido, obtenemos uno nuevo
                console.error('Error al validar el TA almacenado:', error);
                const newTA = await this.getValidTA(wsaaFe, "wsfe");
                this.wsfe = new Wsfe(newTA, this.conf);
            }
        }
    }

    async initWspci() {
        const taFile = path.join(__dirname, 'ws_sr_constancia_inscripcion_ta.xml');
        const wsaaPci = new Wsaa({
            ...this.conf,
            service: "ws_sr_constancia_inscripcion",
        });
        wsaaPci.setCertificate(this.pem);
        wsaaPci.setKey(this.key);

        if (!this.wspci) {
            // Si this.wspci no está inicializado, obtenemos el TA
            const ta = await this.getValidTA(wsaaPci, "ws_sr_constancia_inscripcion");
            this.wspci = new Wspci(ta, this.conf);
        } else {
            try {
                // Verificamos si el TA almacenado es válido
                const storedTA = wsaaPci.createTAFromString(fs.readFileSync(taFile, 'utf8'));
                if (!storedTA.isValid()) {
                    // Si el TA no es válido, obtenemos uno nuevo
                    const newTA = await this.getValidTA(wsaaPci, "ws_sr_constancia_inscripcion");
                    this.wspci = new Wspci(newTA, this.conf);
                } else {
                    console.log('El TA almacenado para ws_sr_constancia_inscripcion es válido.');
                }
            } catch (error) {
                // Si hay un error al leer el archivo o el TA no es válido, obtenemos uno nuevo
                console.error('Error al validar el TA almacenado para ws_sr_constancia_inscripcion:', error);
                const newTA = await this.getValidTA(wsaaPci, "ws_sr_constancia_inscripcion");
                this.wspci = new Wspci(newTA, this.conf);
            }
        }
    }

    async getValidTA(wsaa, service) {
        let ta;
        const taFile = path.join(__dirname, `${service}_ta.xml`);
        try {
            ta = wsaa.createTAFromString(fs.readFileSync(taFile, 'utf8'));
            if (!ta.isValid()) throw new Error("TA inválido");
        } catch {
            const tra = wsaa.createTRA(service);
            ta = await tra.supplicateTA();
            fs.writeFileSync(taFile, ta.TA);
        }
        return ta;
    }

    async retryIfConnReset(fn, retries = 3, label = "AFIP call") {
        for (let i = 0; i < retries; i++) {
            try {
                return await fn();
            } catch (err) {
                if (err.code === "ECONNRESET" && i < retries - 1) {
                    console.warn(
                        `${label} falló con ECONNRESET. Reintento ${i + 1}/${retries}`
                    );
                    await new Promise((res) => setTimeout(res, 500));
                } else {
                    throw err;
                }
            }
        }
    }

    async getTiposIva() {
        await this.initWsfe();
        const response = await this.retryIfConnReset(
            () => this.wsfe.FEParamGetTiposIva({}),
            3,
            "FEParamGetTiposIva"
        );
        console.dir(response, { depth: null });
    }

    async getPersona(cuit) {
        await this.initWspci();
        const response = await this.retryIfConnReset(
            () =>
                this.wspci.getPersona_v2({
                    cuitRepresentada: this.CUIT,
                    idPersona: cuit,
                }),
            3,
            "getPersona_v2"
        );
        return response;
    }

    async ultimoAutorizado(PtoVta, CbteTipo) {
        await this.initWsfe();
        const response = await this.retryIfConnReset(
            () => this.wsfe.FECompUltimoAutorizado({ PtoVta, CbteTipo }),
            3,
            "FECompUltimoAutorizado"
        );
        return response.FECompUltimoAutorizadoResult.CbteNro;
    }

    async facturaA(monto, cuit) {
        try {
            await this.initWsfe();
            const CbteTipo = 1;
            const ultimoAutorizado = await this.ultimoAutorizado(this.ptoVta, CbteTipo);
            const fecha = this.getCurrentDate();
            const { importe_total, importe_gravado, importe_iva } = this.calculateImportes(monto);
            const factura = this.buildFactura(CbteTipo, cuit, ultimoAutorizado, fecha, importe_total, importe_gravado, importe_iva);
            const response = await this.retryIfConnReset(
                () => this.wsfe.FECAESolicitar(factura),
                3,
                "FECAESolicitar (facturaA)"
            );
            return {
                CAE: response.FECAESolicitarResult.FeDetResp.FECAEDetResponse[0].CAE,
                vtoCAE: response.FECAESolicitarResult.FeDetResp.FECAEDetResponse[0].CAEFchVto,
                numeroComprobante: ultimoAutorizado + 1,
                docTipo: 80,
            };
        } catch (error) {
            console.error('Error en afipService.facturaA:', error.message);
            throw error;
        }
    }

    async facturaB(monto, docNro, condicion) {
        try {
            await this.initWsfe();
            const CbteTipo = 6;
            const ultimoAutorizado = await this.ultimoAutorizado(this.ptoVta, CbteTipo);
            const fecha = this.getCurrentDate();
            const { importe_total, importe_gravado, importe_iva } = this.calculateImportes(monto);
            const docTipo = docNro.toString().length === 11 ? 80 : docNro !== 0 ? 96 : 99;
            const factura = this.buildFactura(CbteTipo, docNro, ultimoAutorizado, fecha, importe_total, importe_gravado, importe_iva, docTipo, condicion);
            const response = await this.retryIfConnReset(
                () => this.wsfe.FECAESolicitar(factura),
                3,
                "FECAESolicitar (facturaB)"
            );
            return {
                CAE: response.FECAESolicitarResult.FeDetResp.FECAEDetResponse[0].CAE,
                vtoCAE: response.FECAESolicitarResult.FeDetResp.FECAEDetResponse[0].CAEFchVto,
                numeroComprobante: ultimoAutorizado + 1,
                docTipo,
                importe_total,
                importe_gravado,
                importe_iva,
            };
        } catch (error) {
            console.error('Error en afipService.facturaB:', error.message);
            throw error;
        }
    }

    async notaCreditoA(monto, cuit, facturaNumero) {
        await this.initWsfe();
        const CbteTipo = 3;
        const ultimoAutorizado = await this.ultimoAutorizado(this.ptoVta, CbteTipo);
        const fecha = this.getCurrentDate();
        const { importe_total, importe_gravado, importe_iva } = this.calculateImportes(monto);
        const factura = this.buildFactura(CbteTipo, cuit, ultimoAutorizado, fecha, importe_total, importe_gravado, importe_iva, 80, {
            Tipo: 1,
            PtoVta: this.ptoVta,
            Nro: facturaNumero,
        });
        const response = await this.retryIfConnReset(
            () => this.wsfe.FECAESolicitar(factura),
            3,
            "FECAESolicitar (notaCreditoA)"
        );
        console.dir(response, { depth: null });
        return {
            CAE: response.FECAESolicitarResult.FeDetResp.FECAEDetResponse[0].CAE,
            vtoCAE: response.FECAESolicitarResult.FeDetResp.FECAEDetResponse[0].CAEFchVto,
            numeroComprobante: ultimoAutorizado + 1,
            docTipo: 80,
        }
    }

    async notaCreditoB(monto, docNro, facturaNumero) {
        await this.initWsfe();
        const CbteTipo = 8;
        const ultimoAutorizado = await this.ultimoAutorizado(this.ptoVta, CbteTipo);
        const fecha = this.getCurrentDate();
        const { importe_total, importe_gravado, importe_iva } = this.calculateImportes(monto);
        docNro = docNro ?? 0;
        const docTipo = docNro !== 0 ? 96 : 99;
        const factura = this.buildFactura(CbteTipo, docNro, ultimoAutorizado, fecha, importe_total, importe_gravado, importe_iva, docTipo, {
            Tipo: 6,
            PtoVta: this.ptoVta,
            Nro: facturaNumero,
        });
        const response = await this.retryIfConnReset(
            () => this.wsfe.FECAESolicitar(factura),
            3,
            "FECAESolicitar (notaCreditoB)"
        );
        console.dir(response, { depth: null });
        return {
            CAE: response.FECAESolicitarResult.FeDetResp.FECAEDetResponse[0].CAE,
            vtoCAE: response.FECAESolicitarResult.FeDetResp.FECAEDetResponse[0].CAEFchVto,
            numeroComprobante: ultimoAutorizado + 1,
            docTipo,
        }
    }

    async getCondicionIvaReceptor() {
        await this.initWsfe();
        const response = await this.wsfe.FEParamGetCondicionIvaReceptor();
        console.dir(response, { depth: null });
    };

    getCurrentDate() {
        return new Date(Date.now() - ((new Date()).getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    }

    calculateImportes(monto) {
        const importe_total = parseFloat(monto).toFixed(2);
        const importe_gravado = (importe_total / 1.21).toFixed(2);
        const importe_iva = (importe_total - importe_gravado).toFixed(2);
        return { importe_total, importe_gravado, importe_iva };
    }

    buildFactura(CbteTipo, docNro, ultimoAutorizado, fecha, importe_total, importe_gravado, importe_iva, docTipo = 80, condicion, cbteAsoc = null) {

        // ============ Fechas ============
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, "0");
        const d = String(today.getDate()).padStart(2, "0");
        const formattedDate = parseInt(y + m + d);
        const FchServDesde = formattedDate;
        const FchServHasta = formattedDate;
        const FchVtoPago = formattedDate;

        // ============ Ajuste según condición ============
        let Concepto = 3;
        let ImpTotal = importe_total;
        let ImpNeto = importe_gravado;
        let ImpOpEx = 0.00;
        let ImpIVA = importe_iva;
        let IvaNodo = {
            AlicIva: [{
                Id: 5,             // 21% (por ejemplo); cámbialo si facturas otro alícuota
                BaseImp: importe_gravado,
                Importe: importe_iva,
            }]
        };

        let CondicionIVAReceptorId = 5;

        if (condicion === "IVA EXENTO") {
            ImpTotal = importe_total;
            ImpNeto = 0.00;           // no hay base gravada
            ImpOpEx = importe_total;  // todo es exento
            ImpIVA = 0.00;
            IvaNodo = null;           // **omitimos** el nodo Iva
            CondicionIVAReceptorId = 4;
        }

        // ============ Estructura del detalle ============
        const detalle = {
            Concepto,
            DocTipo: docTipo,
            DocNro: docNro,
            CbteDesde: ultimoAutorizado + 1,
            CbteHasta: ultimoAutorizado + 1,
            CbteFch: parseInt(fecha.replace(/-/g, "")),
            FchServDesde,
            FchServHasta,
            FchVtoPago,
            ImpTotal,
            ImpTotConc: 0.00,
            ImpNeto,
            ImpOpEx,
            ImpTrib: 0.00,
            ImpIVA,
            MonId: "PES",
            MonCotiz: 1,
            CondicionIVAReceptorId,
            ...(IvaNodo && { Iva: IvaNodo }),
            ...(cbteAsoc && {
                CbtesAsoc: { CbteAsoc: [cbteAsoc] }
            })
        };

        // ============ Retorno completo ============
        return {
            FeCAEReq: {
                FeCabReq: {
                    CantReg: 1,
                    PtoVta: this.ptoVta,
                    CbteTipo,
                },
                FeDetReq: { FECAEDetRequest: detalle }
            }
        };
    }
}

module.exports = AfipService;
