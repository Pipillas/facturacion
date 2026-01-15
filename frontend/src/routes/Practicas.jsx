//frontend/src/routes/Practicas.jsx
import { useState, useEffect } from 'react';
import { NumericFormat } from 'react-number-format';
import '../styles/practicas.css';

import { socket } from '../main';

function Practicas() {
    const [modal, setModal] = useState(false);

    const [practica, setPractica] = useState({
        codigo: '',
        nombre: '',
        valor: '',
        iva: '21', // Valor por defecto
    });

    const [practicas, setPracticas] = useState([]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setPractica(prevState => ({
            ...prevState,
            [name]: value,
        }));
    };

    const guardarPractica = () => {
        socket.emit('guardar-practica', practica);
        setModal(false);
    }

    const requestPracticas = () => socket.emit('request-practicas');

    const editarPractica = (p) => {
        setModal(true);
        setPractica(p);
    };

    const borrarPractica = (e, p) => {
        e.stopPropagation();
        if (window.confirm(`Estas seguro que quieres eliminar la practica ${p.nombre}`)) {
            socket.emit('borrar-practica', p._id)
        };
    };

    const openModal = () => {
        setPractica({
            codigo: '',
            nombre: '',
            valor: '',
            iva: '21', // Valor por defecto
        });
        setModal(true);
    };

    useEffect(() => {
        socket.on('cambios', () => {
            requestPracticas();
        });
        socket.on('response-practicas', (p) => {
            setPracticas(p);
        });
        requestPracticas();
        return () => {
            socket.off('cambios');
            socket.off('response-practicas');
        };
    }, []);

    return (
        <>
            <div className="body-practicas">
                <div className="form-practicas">
                    <div className="nueva-practica">
                        <button onClick={() => openModal()}>NUEVA PRACTICA</button>
                    </div>
                    <table className="table-practicas">
                        <thead>
                            <tr className="encabezado">
                                <th style={{ width: '150px' }}>CODIGO</th>
                                <th>PRACTICA</th>
                                <th style={{ width: '150px' }}>VALOR</th>
                                <th style={{ width: '60px' }}>IVA</th>
                                <th style={{ width: '41px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                practicas?.map((prac, index) => <tr onClick={() => editarPractica(prac)} className="tr-practicas" key={index}>
                                    <td>{prac.codigo}</td>
                                    <td>{prac.nombre}</td>
                                    <td><NumericFormat displayType='text' prefix='$' value={prac.valor} thousandSeparator="." decimalSeparator=',' /></td>
                                    <td>{prac.iva}%</td>
                                    <td className="td-icon" onClick={(e) => borrarPractica(e, prac)}><i className="bi bi-trash3-fill"></i></td>
                                </tr>)
                            }
                        </tbody>
                    </table>
                </div>
            </div>
            {
                modal && (
                    <>
                        <div className="modal-backdrop fade show" onClick={() => setModal(false)}></div>
                        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
                            <div className="modal-dialog" role="document">
                                <div className="modal-content" aria-hidden="false"> {/* Ensure modal content is not hidden */}
                                    <div className="modal-header">
                                        <h5 className="modal-title" id="exampleModalLabel">NUEVA PRACTICA</h5>
                                    </div>
                                    <div className="modal-body">
                                        <div className="modal-input">
                                            <span>Codigo</span>
                                            <input
                                                type="text"
                                                name="codigo"
                                                value={practica.codigo}
                                                onChange={handleInputChange}
                                                autoComplete='off'
                                            />
                                        </div>
                                        <div className="modal-input">
                                            <span>Nombre</span>
                                            <input
                                                type="text"
                                                name="nombre"
                                                value={practica.nombre}
                                                onChange={handleInputChange}
                                                autoComplete='off'
                                            />
                                        </div>
                                        <div className="modal-input">
                                            <span>Valor</span>
                                            <NumericFormat prefix='$' value={practica.valor} thousandSeparator="." decimalSeparator=',' onValueChange={e => setPractica(prev => ({ ...prev, valor: e.floatValue }))} />
                                        </div>
                                        <div className="modal-input">
                                            <span>IVA</span>
                                            <select
                                                name="iva"
                                                value={practica.iva}
                                                onChange={handleInputChange}
                                            >
                                                <option value="21">21%</option>
                                                <option value="10">10%</option>
                                                <option value="5">5%</option>
                                                <option value="0">0%</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cerrar</button>
                                        <button type="button" className="btn btn-primary" onClick={guardarPractica}>Guardar</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )
            }
        </>
    );
}

export default Practicas;