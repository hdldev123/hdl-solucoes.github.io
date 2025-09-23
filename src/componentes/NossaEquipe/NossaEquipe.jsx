import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import './NossaEquipe.css';
import fotoHugo from '../../assets/hugo-perf.jpeg'; 
import fotoLucas from '../../assets/lucas-perf.jpeg'; 
import fotoHigor from '../../assets/higor-perf.jfif'; 
import fotoDavydson from '../../assets/dav-perf.jpeg';
import defaultProfileImage from '../../assets/default-profile.js';

const NossaEquipe = () => {
  const { ref, inView } = useInView({
    threshold: 0.2,
    triggerOnce: true
  });

  const membros = [
    {
      nome: "Hugo Garcia",
      cargo: "Desenvolvedor Full-Stack JAVA",
      descricao: "Programador de sistemas em multinacional de energia, amplo conhecimento em Java, React e SQL.",
      especialidades: ["Java", "React", "SQL", "Spring Boot"],
      foto: fotoHugo,
      corDestaque: "#3b82f6"
    },
    {
      nome: "Davydson Maciel",
      cargo: "Desenvolvedor Full-Stack TypeScript",
      descricao: "Programador de sistemas em fintech do ramo financeiro, amplo conhecimento em TypeScript, React e NestJS.",
      especialidades: ["TypeScript", "React", "NestJS", "Node.js"],
      foto: fotoDavydson,
      corDestaque: "#10b981"
    },
    {
      nome: "Lucas Araújo Ramos",
      cargo: "Desenvolvedor Full-Stack .NET",
      descricao: "Programador de sistemas em multinacional do ramo de energia, amplo conhecimento em C# e .NET Framework.",
      especialidades: ["C#", ".NET", "ASP.NET", "Azure"],
      foto: fotoLucas,
      corDestaque: "#8b5cf6"
    },
    {
      nome: "Higor Benevenuto",
      cargo: "Desenvolvedor Full-Stack Javascript",
      descricao: "Programador de sistemas em multinacional do ramo de energia, amplo conhecimento em Javascript, React e Node.js.",
      especialidades: ["Javascript", "React", "Node.js", "Express"],
      foto: fotoHigor,
      corDestaque: "#dfd008ff"
    }
  ];

  const variantesCard = {
    oculto: { opacity: 0, y: 50, rotateY: -15 },
    visivel: { 
      opacity: 1, 
      y: 0,
      rotateY: 0,
      transition: { duration: 0.7, ease: "easeOut" }
    }
  };

  return (
    <section id="equipe" className="secao fundo-claro" ref={ref}>
      <div className="container">
        <motion.div
          initial="oculto"
          animate={inView ? "visivel" : "oculto"}
          variants={{
            visivel: {
              transition: {
                staggerChildren: 0.3
              }
            }
          }}
        >
          <motion.h2 
            className="titulo-secao"
            variants={variantesCard}
          >
            Nossa Equipe
          </motion.h2>
          
          <motion.p 
            className="subtitulo-secao"
            variants={variantesCard}
          >
            Conheça os especialistas que transformam suas ideias em realidade
          </motion.p>

          <div className="equipe-grid">
            {membros.map((membro, index) => (
              <motion.div
                key={membro.nome}
                className="cartao-membro"
                variants={variantesCard}
                whileHover={{ 
                  scale: 1.05,
                  rotateY: 5,
                  transition: { duration: 0.3 }
                }}
              >
                <div className="foto-container" style={{ backgroundColor: `${membro.corDestaque}20` }}>
                  <img 
                    src={membro.foto} 
                    alt={membro.nome}
                    className="foto-membro"
                    onError={(e) => {
                      e.target.src = defaultProfileImage;
                      e.target.onerror = null;
                    }}
                  />
                  <div className="overlay-foto"></div>
                  <div className="icone-especialidade" style={{ background: membro.corDestaque }}>
                    👨‍💻
                  </div>
                </div>
                
                <div className="info-membro">
                  <h3 className="nome-membro">{membro.nome}</h3>
                  <p className="cargo-membro" style={{ color: membro.corDestaque }}>
                    {membro.cargo}
                  </p>
                  <p className="descricao-membro">{membro.descricao}</p>
                  
                  <div className="especialidades">
                    {membro.especialidades.map((tech, idx) => (
                      <span 
                        key={idx} 
                        className="tech-badge"
                        style={{ borderColor: membro.corDestaque, color: membro.corDestaque }}
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                  
                  <div className="redes-sociais">
                    <a href="#" className="link-social" style={{ background: membro.corDestaque }}>
                      💼
                    </a>
                    <a href="#" className="link-social" style={{ background: membro.corDestaque }}>
                      📧
                    </a>
                    <a href="#" className="link-social" style={{ background: membro.corDestaque }}>
                      🔗
                    </a>
                  </div>
                </div>
                
                <div className="efeito-borda" style={{ background: `linear-gradient(45deg, ${membro.corDestaque}20, transparent)` }}></div>
              </motion.div>
            ))}
          </div>

          <motion.div 
            className="valores-equipe"
            variants={variantesCard}
          >
            <div className="container-valores">
              <h3>Por que escolher nossa equipe?</h3>
              <div className="valores-grid">
                <div className="valor-equipe">
                  <div className="icone-valor">🎯</div>
                  <h4>Experiência Diversificada</h4>
                  <p>Cada membro traz experiência única de diferentes setores do mercado</p>
                </div>
                <div className="valor-equipe">
                  <div className="icone-valor">⚡</div>
                  <h4>Tecnologias Modernas</h4>
                  <p>Dominamos as principais tecnologias e frameworks do mercado atual</p>
                </div>
                <div className="valor-equipe">
                  <div className="icone-valor">🤝</div>
                  <h4>Trabalho em Equipe</h4>
                  <p>Colaboração eficiente para entregar os melhores resultados</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default NossaEquipe;