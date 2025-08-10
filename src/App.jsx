import React from 'react';
import Cabecalho from './componentes/Cabecalho/Cabecalho';
import CapaPrincipal from './componentes/CapaPrincipal/CapaPrincipal';
import SobreNos from './componentes/SobreNos/SobreNos';
import NossosServicos from './componentes/NossosServicos/NossosServicos';
import NossaEquipe from './componentes/NossaEquipe/NossaEquipe';
import FormularioContato from './componentes/FormularioContato/FormularioContato';
import Rodape from './componentes/Rodape/Rodape';
import './estilos/global.css';

function App() {
  return (
    <div className="App">
      <Cabecalho />
      <CapaPrincipal />
      <SobreNos />
      <NossosServicos />
      <NossaEquipe />
      <FormularioContato />
      <Rodape />
    </div>
  );
}

export default App;