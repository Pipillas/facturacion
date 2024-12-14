import '../styles/app.css';
import '../styles/toggleswitch.css';
import React, { useEffect, useState } from 'react';
import Select from 'react-select';
import { socket } from '../main';
import { NumericFormat } from 'react-number-format';

const selectStyles = {
  control: (styles) => ({
    ...styles,
    backgroundColor: 'white',
    cursor: 'text',
    width: '100%',
  }),
  container: (styles) => ({
    ...styles,
    width: '100%',
  }),
  menu: (styles) => ({
    ...styles,
    width: '100%',
  }),
};

function App() {
  const [practicas, setPracticas] = useState([]);
  const [selectedPracticas, setSelectedPracticas] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false); // Estado para bloquear interacciones
  const [datos, setDatos] = useState({
    tipoDoc: 'DNI',
    numDoc: '',
    nombre: '',
    medio: 'QR',
    condicion: 'CONSUMIDOR FINAL',
    domicilio: '',
    telefono: '',
    mipymes: false,
  });

  const requestPracticas = () => socket.emit('request-practicas');

  useEffect(() => {
    socket.on('cambios', () => {
      requestPracticas();
    });

    socket.on('response-practicas', (p) => {
      const options = p.map((practica) => ({
        value: practica.codigo,
        label: practica.nombre,
        iva: practica.iva,
        valor: practica.valor,
      }));
      setPracticas(options);
    });

    socket.on('response-persona', (data) => {
      setDatos(prev => ({ ...prev, nombre: data.nombre, condicion: data.condicion, domicilio: data.domicilio }));
    })

    requestPracticas();
    return () => {
      socket.off('cambios');
      socket.off('response-practicas');
      socket.off('response-persona');
    };
  }, []);

  const handleSelectChange = (selectedOption) => {
    if (selectedOption) {
      setSelectedPracticas([...selectedPracticas, { ...selectedOption, cantidad: 1 }]); // Iniciar cantidad en 1
    }
  };

  const borrarPracticaSeleccionada = (index) => {
    setSelectedPracticas((prev) => prev.filter((_, i) => i !== index));
  };

  const facturar = async () => {
    if (isProcessing) return; // Prevenir clics adicionales mientras se procesa

    setIsProcessing(true); // Bloquear interacciones

    // Validaciones
    if (datos.tipoDoc === 'DNI' && datos.numDoc.toString().length > 8) {
      alert('No es posible facturar con un número de documento mayor a 8 dígitos para DNI.');
      setIsProcessing(false);
      return;
    }

    if (datos.tipoDoc === 'CUIT' && datos.numDoc.toString().length !== 11) {
      alert('No es posible facturar con un CUIT distinto a 11 dígitos');
      setIsProcessing(false);
      return;
    }

    // Verificar que hay al menos una práctica seleccionada y su valor es mayor a 0
    const validPracticas = selectedPracticas.filter(practica => practica.valor > 0);
    if (validPracticas.length === 0) {
      alert('Debes seleccionar al menos una práctica con valor mayor a 0 para facturar.');
      setIsProcessing(false);
      return;
    }

    // Enviar cantidad junto con los datos de las prácticas al backend
    const datosPracticas = selectedPracticas.map((practica) => ({
      ...practica,
      total: practica.valor * practica.cantidad, // Calcular total por práctica
    }));

    socket.emit('facturar', datosPracticas, datos);

    await new Promise(res => setTimeout(res, 2000));

    window.location.reload();
  };

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDatos((prevDatos) => ({
      ...prevDatos,
      [name]: value,
    }));
  };

  // Manejar cambio del checkbox
  const handleCheckboxChange = (e) => {
    setDatos((prevDatos) => ({
      ...prevDatos,
      mipymes: e.target.checked,
    }));
  };

  const getPersona = () => {
    if (datos.tipoDoc === 'CUIT') {
      socket.emit('request-persona', datos.numDoc)
    }
  };

  // Calcula el total de las prácticas seleccionadas
  const calculateTotal = () => {
    return selectedPracticas.reduce((sum, practica) => {
      return sum + practica.valor * practica.cantidad;
    }, 0);
  };

  return (
    <div className="div-body">
      <div className="form">
        <div className="form-input">
          <div className="tipodoc">
            <span>TIPO</span>
            <select name="tipoDoc" onChange={handleInputChange}>
              <option value="DNI">DNI</option>
              <option value="CUIT">CUIT</option>
            </select>
          </div>
          {
            datos.tipoDoc === 'DNI' ? <NumericFormat
              value={datos.numDoc}
              thousandSeparator='.'
              decimalSeparator=','
              decimalScale={0}
              onValueChange={(e) => setDatos(prev => ({ ...prev, numDoc: e.floatValue }))}
            /> : <input
              type="text"
              name="numDoc"
              onChange={handleInputChange}
              value={datos.numDoc}
              onBlur={getPersona}
              autoComplete='off'
            />
          }
        </div>
        <div className="form-input">
          <span>NOMBRE</span>
          <input
            type="text"
            name="nombre"
            onChange={handleInputChange}
            value={datos.nombre}
            autoComplete='off'
          />
        </div>
        <div className="form-input">
          <span>MEDIO DE PAGO</span>
          <select name="medio" onChange={handleInputChange}>
            <option value="QR">QR</option>
            <option value="EFECTIVO">EFECTIVO</option>
            <option value="TRANSFERENCIA">TRANSFERENCIA</option>
            <option value="TARJETA VISA">TARJETA VISA</option>
            <option value="TARJETA MAESTRO/MASTERCARD">TARJETA MAESTRO/MASTERCARD</option>
            <option value="TARJETA NARANJA">TARJETA NARANJA</option>
            <option value="TARJETA AMERICAN EXPRESS">TARJETA AMERICAN EXPRESS</option>
            <option value="OTRO">OTRO</option>
          </select>
        </div>
        <div className="form-input">
          <span>CONDICION FRENTE AL IVA</span>
          <select value={datos.condicion} name="condicion" onChange={handleInputChange}>
            <option value="CONSUMIDOR FINAL">CONSUMIDOR FINAL</option>
            <option value="MONOTRIBUTO">MONOTRIBUTO</option>
            <option value="RESPONSABLE INSCRIPTO">RESPONSABLE INSCRIPTO</option>
            <option value="IVA EXENTO">IVA EXENTO</option>
          </select>
        </div>
        <div className="form-input">
          <span>DOMICILIO</span>
          <input
            type="text"
            name="domicilio"
            onChange={handleInputChange}
            value={datos.domicilio}
            autoComplete='off'
          />
        </div>
        <div className="form-input">
          <span>TELEFONO</span>
          <input
            type="text"
            name="telefono"
            onChange={handleInputChange}
            value={datos.telefono}
            autoComplete='off'
          />
        </div>
        <div className="form-input toggle-container">
          <span>MiPyMEs</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={datos.mipymes}
              onChange={handleCheckboxChange}
            />
            <span className="slider round"></span>
          </label>
        </div>
      </div>
      <div className="form-practicas">
        <table className="table-practicas">
          <thead>
            <tr className="encabezado">
              <th style={{ width: '75px' }}>CANT</th>
              <th>PRACTICA</th>
              <th style={{ width: '60px' }}>IVA</th>
              <th style={{ width: '150px' }}>P/U</th>
              <th style={{ width: '150px' }}>P/T</th>
              <th style={{ width: '41px' }}></th>
            </tr>
          </thead>
          <tbody>
            {selectedPracticas.map((practica, index) => (
              <tr key={index}>
                <td>
                  <NumericFormat
                    value={practica.cantidad}
                    displayType={'input'}
                    thousandSeparator='.'
                    decimalSeparator=','
                    onValueChange={(values) => {
                      const { floatValue } = values;
                      if (floatValue !== undefined) {
                        const updatedPracticas = [...selectedPracticas];
                        updatedPracticas[index].cantidad = floatValue;
                        setSelectedPracticas(updatedPracticas);
                      }
                    }}
                    className="td-input"
                  />
                </td>
                <td>{practica.label}</td>
                <td>{practica.iva}%</td>
                <td>
                  <NumericFormat
                    value={practica.valor}
                    displayType={'input'}
                    prefix={'$'}
                    thousandSeparator='.'
                    decimalSeparator=','
                    onValueChange={(values) => {
                      const { floatValue } = values;
                      if (floatValue !== undefined) {
                        const updatedPracticas = [...selectedPracticas];
                        updatedPracticas[index].valor = floatValue; // Actualizar el valor unitario
                        setSelectedPracticas(updatedPracticas);
                      }
                    }}
                    className="td-input"
                  />
                </td>
                <td>
                  <NumericFormat
                    displayType='text'
                    value={practica.valor * practica.cantidad}
                    thousandSeparator='.'
                    decimalSeparator=','
                    prefix={'$'}
                  />
                </td>
                <td className="td-icon" onClick={() => borrarPracticaSeleccionada(index)}>
                  <i className="bi bi-trash3-fill"></i>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="select-practicas">
          <Select
            options={practicas}
            onChange={handleSelectChange}
            placeholder="Elegir practica..."
            isClearable
            styles={selectStyles}
            value={null}
          />
        </div>
        <div className="div-facturar">
          <div className="total-facturar">
            <div>
              <span className="span-total">
                TOTAL:
              </span>
              <NumericFormat
                className="total"
                displayType='text'
                value={calculateTotal()}
                thousandSeparator='.'
                decimalSeparator=','
                prefix='$'
              />
            </div>
            <button className="boton-facturar" onClick={facturar} disabled={isProcessing}>FACTURAR</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;