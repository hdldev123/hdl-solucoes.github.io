import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Mail, Phone, MapPin, Clock, Facebook, Instagram, Twitter, Linkedin, CheckCircle } from 'lucide-react';
import './FormularioContato.css';

const FormularioContato = () => {
  const [dadosForm, setDadosForm] = useState({
    nome: '',
    email: '',
    empresa: '',
    servico: '',
    mensagem: ''
  });
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const { ref, inView } = useInView({
    threshold: 0.2,
    triggerOnce: true
  });

  const lidarComMudanca = (e) => {
    setDadosForm({
      ...dadosForm,
      [e.target.name]: e.target.value
    });
  };

  const lidarComEnvio = async (e) => {
    e.preventDefault();
    setEnviando(true);
    
    // Simular envio do formulário
    setTimeout(() => {
      setEnviando(false);
      setEnviado(true);
      setDadosForm({ nome: '', email: '', empresa: '', servico: '', mensagem: '' });
      
      // Resetar após 3 segundos
      setTimeout(() => {
        setEnviado(false);
      }, 3000);
    }, 2000);
  };

  const transitionSuave = { duration: 0.9, ease: [0.25, 0.4, 0.25, 1] };

  const variantesCard = {
    oculto: { opacity: 0, y: 50 },
    visivel: { 
      opacity: 1, 
      y: 0,
      transition: transitionSuave
    }
  };

  const informacoesContato = [
    { icone: Mail, titulo: "Email", valor: "contato@hdlsolucoes.com", link: "mailto:contato@hdlsolucoes.com" },
    { icone: Phone, titulo: "WhatsApp", valor: "(11) 99999-9999", link: "https://wa.me/5511999999999" },
    { icone: MapPin, titulo: "Localização", valor: "Cataguases - MG", link: "#" },
    { icone: Clock, titulo: "Horário", valor: "Seg - Sex: 9h às 18h", link: "#" }
  ];

  return (
    <section id="contato" className="secao fundo-gradiente" ref={ref}>
      <div className="container">
        <motion.div
          initial="oculto"
          animate={inView ? "visivel" : "oculto"}
          variants={{
            visivel: {
              transition: {
                staggerChildren: 0.15
              }
            }
          }}
        >
          <motion.h2 
            className="titulo-secao-contato titulo-contato-2"
            variants={variantesCard}
          >
            Entre em Contato
          </motion.h2>
          
          <motion.p 
            className="subtitulo-secao subtitulo-contato"
            variants={variantesCard}
          >
            Pronto para transformar sua ideia em realidade? Vamos conversar!
          </motion.p>

          <div className="contato-conteudo">
            <motion.div 
              className="informacoes-contato"
              variants={variantesCard}
            >
              <h3>Vamos conversar</h3>
              <p>
                Estamos ansiosos para conhecer seu projeto e mostrar como 
                podemos ajudar a transformar suas ideias em soluções digitais incríveis.
              </p>
              
              <div className="info-items">
                {informacoesContato.map((info, index) => (
                  <motion.a
                    key={info.titulo}
                    href={info.link}
                    className="info-item"
                    whileHover={{ scale: 1.05, x: 10 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="info-icone">{React.createElement(info.icone, { size: 24 })}</div>
                    <div className="info-texto">
                      <h4>{info.titulo}</h4>
                      <span>{info.valor}</span>
                    </div>
                  </motion.a>
                ))}
              </div>

              <div className="redes-sociais-contato">
                <h4>Nos siga nas redes</h4>
                <div className="redes-links">
                  <a href="#" className="rede-link"><Facebook size={20} /></a>
                  <a href="#" className="rede-link"><Instagram size={20} /></a>
                  <a href="#" className="rede-link"><Twitter size={20} /></a>
                  <a href="#" className="rede-link"><Linkedin size={20} /></a>
                </div>
              </div>
            </motion.div>

            <motion.div 
              className="formulario-container"
              variants={variantesCard}
            >
              {enviado ? (
                <motion.div 
                  className="mensagem-sucesso"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, type: "spring" }}
                >
                  <div className="icone-sucesso"><CheckCircle size={64} /></div>
                  <h3>Mensagem enviada com sucesso!</h3>
                  <p>Entraremos em contato em até 24 horas.</p>
                </motion.div>
              ) : (
                <form className="formulario-contato" onSubmit={lidarComEnvio}>
                  <div className="grupo-input duplo">
                    <div className="campo-input">
                      <label>Nome *</label>
                      <input
                        type="text"
                        name="nome"
                        value={dadosForm.nome}
                        onChange={lidarComMudanca}
                        required
                        placeholder="Seu nome completo"
                      />
                    </div>
                    <div className="campo-input">
                      <label>Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={dadosForm.email}
                        onChange={lidarComMudanca}
                        required
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>

                  <div className="grupo-input duplo">
                    <div className="campo-input">
                      <label>Empresa</label>
                      <input
                        type="text"
                        name="empresa"
                        value={dadosForm.empresa}
                        onChange={lidarComMudanca}
                        placeholder="Nome da sua empresa"
                      />
                    </div>
                    <div className="campo-input">
                      <label>Serviço de Interesse</label>
                      <select
                        name="servico"
                        value={dadosForm.servico}
                        onChange={lidarComMudanca}
                      >
                        <option value="">Selecione um serviço</option>
                        <option value="site">Criação de Site</option>
                        <option value="landing">Landing Page</option>
                        <option value="sistema">Sistema Web</option>
                        <option value="consultoria">Consultoria</option>
                      </select>
                    </div>
                  </div>

                  <div className="campo-input">
                    <label>Mensagem *</label>
                    <textarea
                      name="mensagem"
                      value={dadosForm.mensagem}
                      onChange={lidarComMudanca}
                      required
                      rows="5"
                      placeholder="Conte-nos sobre seu projeto, objetivos e como podemos ajudá-lo..."
                    ></textarea>
                  </div>

                  <motion.button
                    type="submit"
                    className={`botao-enviar ${enviando ? 'enviando' : ''}`}
                    disabled={enviando}
                    whileHover={!enviando ? { scale: 1.02 } : {}}
                    whileTap={!enviando ? { scale: 0.98 } : {}}
                  >
                    {enviando ? (
                      <>
                        <div className="spinner"></div>
                        Enviando...
                      </>
                    ) : (
                      'Enviar Mensagem'
                    )}
                  </motion.button>
                </form>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FormularioContato;
