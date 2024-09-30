import React from 'react'
import '../styles/navigation.css';

function Nav() {
    return (
        <div className="navigation">
            <div onAuxClick={() => window.open('/', '_blank')} onClick={() => window.location.href = '/'}>INICIO</div>
            <div onAuxClick={() => window.open('/practicas', '_blank')} onClick={() => window.location.href = '/practicas'}>PRACTICAS</div>
            <div onAuxClick={() => window.open('/comprobantes', '_blank')} onClick={() => window.location.href = '/comprobantes'}>COMPROBANTES</div>
        </div>
    )
}

export default Nav