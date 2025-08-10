import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import './NossosServicos.css';

const NossosServicos = () => {
  const { ref, inView } = useInView({
    threshold: 0.2,
    triggerOnce: true
  });

  const servicos = [
    {
      titulo: "Criação de Sites",
      descricao: "Sites institucionais modernos e responsivos que destacam sua marca no mercado digital.",
      icone: "🌐",
      recursos: ["Design Responsivo", "SEO Otimizado", "Carregamento Rápido", "CMS Intuitivo"],
      cor: "gradiente-azul"
    },
    {
      titulo: "Landing Pages",
      descricao: "Páginas de conversão otimizadas para transformar visitantes em clientes efetivos.",
      icone: "🎯",
      recursos: ["Alta Conversão", "A/B Testing", "Analytics Integrado", "Mobile First"],
      cor: "gradiente-laranja"
    },
    {
      titulo: "Sistemas Web",
      descricao: "Aplicações web robustas e escaláveis para automatizar processos do seu negócio.",
      icone: "⚙️",
      recursos: ["Arquitetura Escalável", "Segurança Avançada", "API Integration", "Dashboard Completo"],
      cor: "gradiente-verde"
    }
  ];

  const variantesCard = {
    oculto: { opacity: 0, y: 50, scale: 0.9 },
    visivel: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  return (
    <section id="servicos" className="secao" ref={ref}>
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
            Nossos Serviços
          </motion.h2>
          
          <motion.p 
            className="subtitulo-secao"
            variants={variantesCard}
          >
            Soluções completas em desenvolvimento web para impulsionar seu negócio
          </motion.p>

          <div className="servicos-grid">
            {servicos.map((servico, index) => (
              <motion.div
                key={servico.titulo}
                className={`cartao-servico ${servico.cor}`}
                variants={variantesCard}
                whileHover={{ 
                  scale: 1.05,
                  transition: { duration: 0.2 }
                }}
              >
                <div className="servico-header">
                  <div className="servico-icone">{servico.icone}</div>
                  <h3>{servico.titulo}</h3>
                </div>
                
                <p className="servico-descricao">{servico.descricao}</p>
                
                <ul className="recursos-lista">
                  {servico.recursos.map((recurso, idx) => (
                    <li key={idx} className="recurso-item">
                      <span className="check-mark">✓</span>
                      {recurso}
                    </li>
                  ))}
                </ul>
                
                <motion.button 
                  className="botao-servico"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Saiba Mais
                </motion.button>
                
                <div className="efeito-hover"></div>
              </motion.div>
            ))}
          </div>

          <motion.div 
            className="processo-trabalho"
            variants={variantesCard}
          >
            <h3>Nosso Processo</h3>
            <div className="processo-steps">
              <div className="step">
                <div className="step-numero">01</div>
                <h4>Análise</h4>
                <p>Entendemos suas necessidades e objetivos</p>
              </div>
              <div className="step">
                <div className="step-numero">02</div>
                <h4>Planejamento</h4>
                <p>Criamos a estratégia e arquitetura ideal</p>
              </div>
              <div className="step">
                <div className="step-numero">03</div>
                <h4>Desenvolvimento</h4>
                <p>Codificamos com as melhores práticas</p>
              </div>
              <div className="step">
                <div className="step-numero">04</div>
                <h4>Entrega</h4>
                <p>Implementamos e oferecemos suporte</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default NossosServicos;