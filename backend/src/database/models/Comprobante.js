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
            type: Array
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
    },
    { timestamps: true }
);

module.exports = mongoose.model("Factura", Factura);
