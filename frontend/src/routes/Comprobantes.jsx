import React, { useState, useEffect } from 'react';
import { NumericFormat } from 'react-number-format';
import { IP, socket } from '../main';
import '../styles/comprobantes.css';

function Comprobantes() {
    const [comprobantes, setComprobantes] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20; // Number of items per page

    const requestComprobantes = () => socket.emit('request-comprobantes');

    useEffect(() => {
        socket.on('cambios', () => {
            // Handle changes if necessary
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

    // Calculate the items to display on the current page
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentComprobantes = comprobantes.slice(indexOfFirstItem, indexOfLastItem);

    // Handle page change
    const totalPages = Math.ceil(comprobantes.length / itemsPerPage);

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    const handlePreviousPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    return (
        <div className="div-comprobantes">
            {/* Pagination Controls */}
            <div className="outer-pagination">
                <div className="pagination">
                    <button className="pagination-button" onClick={handlePreviousPage} disabled={currentPage === 1}><i className="bi bi-arrow-left"></i></button>
                    <span className="pagination-span">{currentPage} de {totalPages}</span>
                    <button className="pagination-button" onClick={handleNextPage} disabled={currentPage === totalPages}><i className="bi bi-arrow-right"></i></button>
                </div>
            </div>
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
                        currentComprobantes.map((comp, index) => (
                            <tr key={index}>
                                <td>{new Date(comp.createdAt).toLocaleDateString()}</td>
                                <td>{comp.pathO.replace('-O.pdf', '')}</td>
                                <td>{comp.nombre}</td>
                                <td><NumericFormat displayType='text' value={comp.numDoc} thousandSeparator="." decimalSeparator=',' /></td>
                                <td><NumericFormat prefix='$ ' displayType='text' value={comp.total} thousandSeparator="." decimalSeparator=',' /></td>
                                <td style={{ width: '60px' }} onClick={() => window.open(`${IP}/${comp.pathO}`, '_blank')} className="td-icon">ORIGINAL</td>
                                <td style={{ width: '60px' }} onClick={() => window.open(`${IP}/${comp.pathD}`, '_blank')} className="td-icon">DUPLICADO</td>
                            </tr>
                        ))
                    }
                </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="outer-pagination">
                <div className="pagination">
                    <button className="pagination-button" onClick={handlePreviousPage} disabled={currentPage === 1}><i className="bi bi-arrow-left"></i></button>
                    <span className="pagination-span">{currentPage} de {totalPages}</span>
                    <button className="pagination-button" onClick={handleNextPage} disabled={currentPage === totalPages}><i className="bi bi-arrow-right"></i></button>
                </div>
            </div>
        </div>
    );
}

export default Comprobantes;