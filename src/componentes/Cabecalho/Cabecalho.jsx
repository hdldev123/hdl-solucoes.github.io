import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import './Cabecalho.css';

const Cabecalho = () => {
  const [estaMostrando, setEstaMostrando] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    setEstaMostrando(true);
    
    // Adicionar classe para mudança de cor do header no scroll
    const handleScroll = () => {
      const cabecalho = document.querySelector('.cabecalho');
      if (window.scrollY > 50) {
        cabecalho.classList.add('cabecalho-fixo');
      } else {
        cabecalho.classList.remove('cabecalho-fixo');
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const itensMenu = [
    { nome: 'Início', link: '#inicio' },
    { nome: 'Sobre', link: '#sobre' },
    { nome: 'Serviços', link: '#servicos' },
    { nome: 'Equipe', link: '#equipe' },
    { nome: 'Contato', link: '#contato' }
  ];

  return (
    <motion.header 
      className="cabecalho"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1, ease: [0.25, 0.4, 0.25, 1] }}
    >
      <div className="container">
        <div className="cabecalho-conteudo">
          <motion.div 
            className="logo"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <h2>HDL Soluções</h2>
          </motion.div>
          
          <nav className={`navegacao ${menuAberto ? 'navegacao-ativa' : ''}`}>
            {itensMenu.map((item, index) => (
              <motion.a
                key={item.nome}
                href={item.link}
                className="link-navegacao"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: estaMostrando ? 1 : 0, y: estaMostrando ? 0 : -20 }}
                transition={{ delay: index * 0.1 + 0.3 }}
                whileHover={{ scale: 1.1 }}
                onClick={() => setMenuAberto(false)}
              >
                {item.nome}
              </motion.a>
            ))}
          </nav>

          <button 
            className="botao-menu"
            onClick={() => setMenuAberto(!menuAberto)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </motion.header>
  );
};

export default Cabecalho;