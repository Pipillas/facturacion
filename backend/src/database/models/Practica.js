const mongoose = require("mongoose");
const { Schema } = mongoose;

const Practica = new Schema(
    {
        codigo: {
            type: String,
        },
        nombre: {
            type: String,
        },
        valor: {
            type: Number,
        },
        iva: {
            type: String,
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Practica", Practica);
