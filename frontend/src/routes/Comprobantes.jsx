import { useState, useEffect } from 'react';
import { NumericFormat } from 'react-number-format';
import { IP, socket } from '../main';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../styles/comprobantes.css';

function Comprobantes() {
    const [comprobantes, setComprobantes] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20; // Number of items per page
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    const requestComprobantes = () => socket.emit('request-comprobantes');

    const handleFilter = () => {
        socket.emit('filter-comprobantes', { startDate, endDate });
    };

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

    const downloadExcel = () => {
        const queryParams = new URLSearchParams();
        if (startDate) queryParams.append('startDate', startDate.toISOString());
        if (endDate) queryParams.append('endDate', endDate.toISOString());

        window.open(`${IP}/export-comprobantes?${queryParams.toString()}`, '_blank');
    };

    return (
        <div>
            <div className="date-filter">
                <DatePicker
                    selected={startDate}
                    onChange={(date) => setStartDate(date)}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Fecha Inicio"
                />
                <DatePicker
                    selected={endDate}
                    onChange={(date) => setEndDate(date)}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Fecha Fin"
                />
                <button className="filter-button" onClick={handleFilter}>Filtrar</button>
                <button className="export-button" onClick={downloadExcel}>Exportar a Excel</button>
            </div>
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
                                    <td>
                                        {String(comp.numDoc).length === 11
                                            ? comp.numDoc
                                            : (
                                                <NumericFormat
                                                    displayType="text"
                                                    value={comp.numDoc}
                                                    thousandSeparator="."
                                                    decimalSeparator=","
                                                />
                                            )
                                        }
                                    </td>
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
        </div>
    );
}

export default Comprobantes;