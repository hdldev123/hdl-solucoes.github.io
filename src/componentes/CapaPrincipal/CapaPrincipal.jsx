import React from 'react';
import { motion } from 'framer-motion';
import './CapaPrincipal.css';

const CapaPrincipal = () => {
  const variantesTexto = {
    oculto: { opacity: 0, y: 50 },
    visivel: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 1, ease: [0.25, 0.4, 0.25, 1] }
    }
  };

  const variantesBotao = {
    oculto: { opacity: 0, scale: 0.8 },
    visivel: { 
      opacity: 1, 
      scale: 1,
      transition: { delay: 1.2, duration: 0.7, ease: [0.25, 0.4, 0.25, 1] }
    }
  };

  return (
    <section id="inicio" className="capa-principal fundo-gradiente">
      <div className="particulas-fundo"></div>
      <div className="container">
        <div className="capa-conteudo">
          <motion.div
            className="capa-texto"
            initial="oculto"
            animate="visivel"
            variants={{
              visivel: {
                transition: {
                  staggerChildren: 0.25
                }
              }
            }}
          >
            <motion.h1 
              className="titulo-principal"
              variants={variantesTexto}
            >
              Transformamos suas <span className="texto-destaque">ideias</span> em realidade digital
            </motion.h1>
            
            <motion.p 
              className="subtitulo-principal"
              variants={variantesTexto}
            >
              Somos a HDL Soluções, especialistas em desenvolvimento web com soluções personalizadas para impulsionar seu negócio no mundo digital.
            </motion.p>
            
            <motion.div 
              className="botoes-capa"
              variants={variantesBotao}
            >
              <motion.a 
                href="#contato" 
                className="botao-primario"
                whileHover={{ 
                  scale: 1.05,
                  boxShadow: "0 15px 35px rgba(255, 107, 53, 0.4)"
                }}
                whileTap={{ scale: 0.95 }}
              >
                Iniciar Projeto
              </motion.a>
              
              <motion.a 
                href="#servicos" 
                className="botao-secundario"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Nossos Serviços
              </motion.a>
            </motion.div>
          </motion.div>
          
          <motion.div 
            className="capa-visual"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 1.2, ease: [0.25, 0.4, 0.25, 1] }}
          >
            <div className="elemento-flutuante elemento-1"></div>
            <div className="elemento-flutuante elemento-2"></div>
            <div className="elemento-flutuante elemento-3"></div>
            <div className="codigo-animado">
              <div className="linha-codigo">
                <span className="tag">&lt;HDL</span>
                <span className="atributo"> soluções</span>
                <span className="valor">="inovadoras"</span>
                <span className="tag">&gt;</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      
      <motion.div 
        className="indicador-scroll"
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
      >
        <span>Role para baixo</span>
        <div className="seta-scroll"></div>
      </motion.div>
    </section>
  );
};

export default CapaPrincipal;