import React, { useState, useEffect } from 'react';
import { NumericFormat } from 'react-number-format';
import { socket } from '../main';

function Comprobantes() {
    const [comprobantes, setComprobantes] = useState([]);

    const requestComprobantes = () => socket.emit('request-comprobantes');

    useEffect(() => {
        socket.on('cambios', () => {
            // Aquí puedes manejar cambios si es necesario
        });

        socket.on('response-comprobantes', (c) => {
            setComprobantes(c);
        });

        requestComprobantes();

        return () => {
            socket.off('cambios');
            socket.off('response-comprobantes');
        };
    }, []);

    return (
        <div className="div-comprobantes">
            <table className="table-practicas">
                <thead>
                    <tr className="encabezado">
                        <th style={{ width: '120px' }}>FECHA</th>
                        <th style={{ width: '200px' }}>COMPROBANTE</th>
                        <th>CLIENTE</th>
                        <th style={{ width: '200px' }}>DOCUMENTO</th>
                        <th style={{ width: '150px' }}>TOTAL</th>
                        <th style={{ width: '132px' }}></th>
                        <th style={{ width: '132px' }}></th>
                    </tr>
                </thead>
                <tbody>
                    {
                        comprobantes?.map((comp, index) => (
                            <tr key={index}>
                                <td>{new Date(comp.createdAt).toLocaleDateString()}</td>
                                <td>{comp.pathO.replace('-O.pdf', '')}</td>
                                <td>{comp.nombre}</td>
                                <td><NumericFormat displayType='text' value={comp.numDoc} thousandSeparator="." decimalSeparator=',' /></td>
                                <td><NumericFormat prefix='$ ' displayType='text' value={comp.total} thousandSeparator="." decimalSeparator=',' /></td>
                                <td style={{ width: '60px' }} onClick={() => window.open(`http://192.168.100.13:3000/${comp.pathO}`, '_blank')} className="td-icon">ORIGINAL</td>
                                <td style={{ width: '60px' }} onClick={() => window.open(`http://192.168.100.13:3000/${comp.pathD}`, '_blank')} className="td-icon">DUPLICADO</td>
                            </tr>
                        ))
                    }
                </tbody>
            </table>
        </div>
    );
}

export default Comprobantes;