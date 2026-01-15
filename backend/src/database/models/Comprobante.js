//backend/src/database/models/Comprobante.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const Factura = new Schema(
    {
        tipoDoc: {
            type: String,
        },
        numDoc: {
            type: String,
        },
        nombre: {
            type: String,
        },
        medio: {
            type: String,
        },
        condicion: {
            type: String,
        },
        domicilio: {
            type: String,
        },
        telefono: {
            type: String,
        },
        mypymes: {
            type: Boolean,
        },
        practicas: {
            type: Array,
        },
        total: {
            type: Number,
        },
        pathO: {
            type: String,
        },
        pathD: {
            type: String,
        },
        cae: {
            type: String,
        },
        vtoCAE: {
            type: String,
        },

        // ✅ NUEVO: datos AFIP
        cbteTipo: { type: Number }, // 6 Factura B, 8 Nota de Crédito B, etc.
        nroCmp: { type: Number }, // número de comprobante

        // ✅ NUEVO: flags/referencias para NC
        esNotaCredito: { type: Boolean, default: false },
        facturaAsociadaId: { type: Schema.Types.ObjectId, ref: "Factura", default: null },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Factura", Factura);
