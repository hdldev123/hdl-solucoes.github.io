import { ArrowLeft } from 'lucide-react';
import logoClaro from '../assets/logo-hdl-claro.webp';
import logoEscuro from '../assets/logo-hdl-escuro.webp';
import SeletorTema from '../SeletorTema.jsx';
import { useTema } from '../tema.js';
import '../estilos/caderno.css';

export default function CadernoLayout({ children }) {
  const tema = useTema();

  return (
    <div className="site-shell caderno-shell">
      <a className="skip-link" href="#conteudo">Ir para o conteúdo</a>

      <header className="site-header caderno-header">
        <a className="brand" href="/" aria-label="HDL Soluções, página inicial">
          <img className="brand-logo brand-logo-light" src={logoClaro} alt="HDL Soluções" width="600" height="358" />
          <img className="brand-logo brand-logo-dark" src={logoEscuro} alt="HDL Soluções" width="600" height="358" />
        </a>

        <nav className="site-nav" aria-label="Navegação do Caderno">
          <a href="/caderno/">Caderno HDL</a>
          <a href="/">Voltar ao site</a>
        </nav>

        <div className="header-actions">
          <a className="caderno-voltar" href="/">
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Voltar ao site</span>
          </a>
          <SeletorTema {...tema} />
        </div>
      </header>

      <main id="conteudo" tabIndex={-1}>
        {children}
      </main>

      <footer className="site-footer caderno-footer">
        <a className="brand brand-footer" href="/" aria-label="HDL Soluções, página inicial">
          <img className="brand-logo brand-logo-light" src={logoClaro} alt="HDL Soluções" width="600" height="358" />
          <img className="brand-logo brand-logo-dark" src={logoEscuro} alt="HDL Soluções" width="600" height="358" />
        </a>
        <p>Produtos digitais pensados para funcionar.</p>
        <span>© {new Date().getFullYear()} HDL Soluções</span>
      </footer>
    </div>
  );
}
