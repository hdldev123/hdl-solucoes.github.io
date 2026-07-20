import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import './SobreNos.css';

const SobreNos = () => {
  const { ref, inView } = useInView({
    threshold: 0.3,
    triggerOnce: true
  });

  const variantesCard = {
    oculto: { opacity: 0, y: 50 },
    visivel: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  return (
    <section id="sobre" className="secao fundo-claro" ref={ref}>
      <div className="container">
        <motion.div
          initial="oculto"
          animate={inView ? "visivel" : "oculto"}
          variants={{
            visivel: {
              transition: {
                staggerChildren: 0.2
              }
            }
          }}
        >
          <motion.h2 
            className="titulo-secao"
            variants={variantesCard}
          >
            Sobre a HDL Soluções
          </motion.h2>
          
          <motion.p 
            className="subtitulo-secao"
            variants={variantesCard}
          >
            Conheça nossa história e filosofia de trabalho
          </motion.p>

          <div className="sobre-conteudo">
            <motion.div 
              className="sobre-texto"
              variants={variantesCard}
            >
              <div className="cartao cartao-sobre">
                <h3>Nossa Missão</h3>
                <p>
                  Somos a HDL Soluções, um time de desenvolvedores web apaixonados por tecnologia 
                  e prontos para transformar suas ideias em realidade digital. Com experiência 
                  sólida em diferentes setores do mercado, criamos soluções robustas e 
                  personalizadas para impulsionar o seu negócio.
                </p>
                
                <div className="estatisticas">
                  <div className="estatistica-item">
                    <span className="numero">50+</span>
                    <span className="label">Projetos Entregues</span>
                  </div>
                  <div className="estatistica-item">
                    <span className="numero">5</span>
                    <span className="label">Especialistas</span>
                  </div>
                  <div className="estatistica-item">
                    <span className="numero">100%</span>
                    <span className="label">Satisfação</span>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              className="sobre-visual"
              variants={variantesCard}
            >
              <div className="elementos-visuais">
                <div className="elemento-codigo">
                  <div className="linha-codigo-sobre">
                    <span className="comentario">// Nossos valores</span>
                  </div>
                  <div className="linha-codigo-sobre">
                    <span className="variavel">const</span> <span className="nome">qualidade</span> = <span className="string">"premium"</span>;
                  </div>
                  <div className="linha-codigo-sobre">
                    <span className="variavel">const</span> <span className="nome">inovacao</span> = <span className="boolean">true</span>;
                  </div>
                  <div className="linha-codigo-sobre">
                    <span className="variavel">const</span> <span className="nome">dedicacao</span> = <span className="numero">100</span><span className="string">"%"</span>;
                  </div>
                </div>
                
                <div className="icones-tecnologia">
                  <div className="icone-tech">React</div>
                  <div className="icone-tech">Node.js</div>
                  <div className="icone-tech">TypeScript</div>
                  <div className="icone-tech">Java</div>
                  <div className="icone-tech">C#</div>
                  <div className="icone-tech">SQL</div>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div 
            className="valores-lista"
            variants={variantesCard}
          >
            <div className="valor-item">
              <div className="valor-icone">🎯</div>
              <h4>Foco no Cliente</h4>
              <p>Suas necessidades são nossa prioridade. Trabalhamos junto com você para criar soluções que realmente fazem a diferença.</p>
            </div>
            <div className="valor-item">
              <div className="valor-icone">⚡</div>
              <h4>Agilidade</h4>
              <p>Utilizamos metodologias ágeis para entregar resultados rápidos sem comprometer a qualidade do produto final.</p>
            </div>
            <div className="valor-item">
              <div className="valor-icone">🔧</div>
              <h4>Tecnologia Avançada</h4>
              <p>Sempre atualizados com as últimas tendências e tecnologias do mercado para oferecer soluções modernas.</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default SobreNos;