import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Briefcase,
  CheckCircle,
  ChevronDown,
  Code2,
  Mail,
  Map,
  Monitor,
  Moon,
  Smartphone,
  Sun,
  X,
  Utensils,
  Wind,
} from 'lucide-react';
import davydsonPhoto from './assets/dav-perf.jpeg';
import hugoPhoto from './assets/hugo-perf.jpeg';
import lucasPhoto from './assets/lucas-perf.jpeg';
import hdlLogo from './assets/logo-hdl.webp';
import matheusPhoto from './assets/matheus-perf.webp';
import financeArtwork from './assets/minha-gestao-financeira.webp';
import phabloPhoto from './assets/phablo-perf.jfif';
import routesArtwork from './assets/recurso-grafico-rotas.webp';
import './estilos/global.css';

const projects = [
  {
    name: 'Minha Gestão Financeira',
    description:
      'Receitas, despesas e objetivos financeiros organizados em uma experiência simples de acompanhar.',
    icon: Smartphone,
    visual: 'mobile',
    status: 'Web + mobile',
  },
  {
    name: 'Respiro App',
    description:
      'Meditação e exercícios respiratórios com a técnica 4-7-8 para alívio rápido da ansiedade e relaxamento.',
    icon: Wind,
    visual: 'breathe',
    status: 'React Native + Expo',
  },
  {
    name: 'Rota Luz de Minas',
    description:
      'Rotas e pontos de atendimento organizados para apoiar decisões em campo.',
    icon: Map,
    visual: 'routes',
    status: 'Conteúdo provisório',
  },
  {
    name: 'Rangô',
    description:
      'Descoberta de comida e conexão local em uma jornada simples e rápida.',
    icon: Utensils,
    visual: 'food',
    status: 'Conteúdo provisório',
  },
];

const themeOptions = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
];

function getInitialTheme() {
  try {
    const savedTheme = window.localStorage.getItem('hdl-theme');
    return themeOptions.some(({ value }) => value === savedTheme) ? savedTheme : 'system';
  } catch {
    return 'system';
  }
}

const team = [
  {
    name: 'Hugo Garcia',
    role: 'Full-stack · Java',
    photo: hugoPhoto,
  },
  {
    name: 'Davydson Maciel',
    role: 'Full-stack · TypeScript',
    photo: davydsonPhoto,
  },
  {
    name: 'Lucas Araújo Ramos',
    role: 'Full-stack · .NET',
    photo: lucasPhoto,
  },
  {
    name: 'Matheus Meigre',
    role: 'Full-stack · .NET & Infra',
    photo: matheusPhoto,
  },
  {
    name: 'Phablo Ribeiro',
    role: 'Full-stack · JavaScript',
    photo: phabloPhoto,
  },
];

const notes = [
  {
    category: 'Produto',
    title: 'Produto primeiro: como cortar ruído antes do primeiro deploy',
  },
  {
    category: 'Engenharia',
    title: 'Da ideia à operação: o que muda quando o software precisa durar',
  },
  {
    category: 'Experiência',
    title: 'Mobile sem atalhos: decisões para experiências que cabem na rotina',
  },
];

function ProjectVisual({ type }) {
  if (type === 'mobile') {
    return (
      <div className="mockup mockup-mobile" aria-hidden="true">
        <img className="finance-artwork" src={financeArtwork} alt="" />
        <span className="artwork-label">Web + mobile</span>
      </div>
    );
  }

  if (type === 'breathe') {
    return (
      <div className="mockup mockup-breathe" aria-hidden="true">
        <div className="breath-orbit breath-orbit-outer" />
        <div className="breath-orbit breath-orbit-inner" />
        <div className="breath-core">
          <Wind size={26} strokeWidth={1.5} />
          <span>inspire</span>
        </div>
        <span className="breath-time">02:00</span>
      </div>
    );
  }

  if (type === 'routes') {
    return (
      <div className="mockup mockup-routes" aria-hidden="true">
        <img className="routes-artwork" src={routesArtwork} alt="" />
        <span className="artwork-label">Identidade do projeto</span>
      </div>
    );
  }

  return (
    <div className="mockup mockup-food" aria-hidden="true">
      <div className="food-header">
        <span>perto de você</span>
        <strong>Escolha seu rangô.</strong>
      </div>
      <div className="food-list">
        <div><i className="food-picture food-picture-one" /><span>Almoço<br /><small>25 min</small></span></div>
        <div><i className="food-picture food-picture-two" /><span>Lanches<br /><small>18 min</small></span></div>
      </div>
      <span className="food-action">ver cardápio</span>
    </div>
  );
}

function BrevoContactForm({ isReady }) {
  const formRef = useRef(null);
  const recaptchaRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [submitState, setSubmitState] = useState('idle');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const submitToBrevo = async (token) => {
    if (!formRef.current) {
      setSubmitState('error');
      setFeedbackMessage('Nao foi possivel preparar o envio do formulario.');
      return;
    }

    try {
      const formData = new FormData(formRef.current);
      formData.set('g-recaptcha-response', token);

      const response = await fetch(`${formRef.current.action}?isAjax=1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: new URLSearchParams(Array.from(formData.entries())),
      });

      const responseText = await response.text();
      const result = responseText ? JSON.parse(responseText) : {};

      if (!response.ok || !result.success) {
        const fieldErrors = result.errors ? Object.values(result.errors).join(' ') : '';
        throw new Error(fieldErrors || result.message || 'Sua mensagem nao pode ser enviada.');
      }

      setSubmitState('success');
      setFeedbackMessage('Sua mensagem para contato foi enviada com sucesso. Em breve entraremos em contato.');
      formRef.current.reset();
    } catch (error) {
      setSubmitState('error');
      setFeedbackMessage(error instanceof Error && error.message
        ? error.message
        : 'Sua mensagem nao pode ser enviada.');
    }
  };

  useEffect(() => {
    if (!isReady || !window.grecaptcha || !recaptchaRef.current || widgetIdRef.current !== null) {
      return;
    }

    widgetIdRef.current = window.grecaptcha.render(recaptchaRef.current, {
      sitekey: '6LelGXQtAAAAAENeVrTnvxegZQN6D1Sz8IfWq8XU',
      size: 'invisible',
      callback: submitToBrevo,
      'error-callback': () => {
        setSubmitState('error');
        setFeedbackMessage('Nao foi possivel validar o reCAPTCHA. Tente novamente.');
      },
    });
  }, [isReady]);

  const handleSend = () => {
    if (!formRef.current) {
      return;
    }

    if (!formRef.current.reportValidity()) {
      return;
    }

    if (widgetIdRef.current === null || !window.grecaptcha) {
      setSubmitState('error');
      setFeedbackMessage('O formulario ainda esta carregando. Aguarde alguns segundos e tente novamente.');
      return;
    }

    setSubmitState('loading');
    setFeedbackMessage('');
    window.grecaptcha.reset(widgetIdRef.current);
    window.grecaptcha.execute(widgetIdRef.current);
  };

  return (
    <div className="sib-form contact-brevo-form">
      <div id="sib-form-container" className="sib-form-container">
        <div
          id="error-message"
          className={`sib-form-message-panel${submitState === 'error' ? ' sib-form-message-panel-visible' : ''}`}
          role="alert"
        >
          <div className="sib-form-message-panel__text sib-form-message-panel__text--center">
            <span className="sib-form-message-panel__icon" aria-hidden="true">!</span>
            <span className="sib-form-message-panel__inner-text">
              {feedbackMessage || 'Sua mensagem nao pode ser enviada.'}
            </span>
          </div>
        </div>

        <div
          id="success-message"
          className={`sib-form-message-panel sib-form-message-panel-success${submitState === 'success' ? ' sib-form-message-panel-visible' : ''}`}
          role="status"
        >
          <div className="sib-form-message-panel__text sib-form-message-panel__text--center">
            <span className="sib-form-message-panel__icon" aria-hidden="true">OK</span>
            <span className="sib-form-message-panel__inner-text">
              {feedbackMessage || 'Sua mensagem para contato foi enviada com sucesso. Em breve entraremos em contato.'}
            </span>
          </div>
        </div>

        <div id="sib-container" className="sib-container--large sib-container--vertical">
          <form
            id="sib-form"
            ref={formRef}
            method="POST"
            action="https://3040d3ef.sibforms.com/serve/MUIFAE0ROVDslblzfMzwKpXtNHwMeYIoR-sbE3pY7YxSglkpmvhJYo_7F0tfj3e27S9XrqoWoD8NhBnmyHMkvVP0Kq6hQDEAv_Gp0o5C-sEG1pjoZRtG_4jGBNGkN3BrRyal4zVDv4btVYnirZiVCcDBl67CsiJn5zXIUV-V9JU0mCh7NmA7zcV3V6l5jM7mkkFaJt8vKkQlK9qf_g=="
            data-type="subscription"
            onSubmit={(event) => event.preventDefault()}
          >
            <div className="sib-form-block sib-form-block-captcha" aria-hidden="true">
              <div ref={recaptchaRef} className="g-recaptcha" />
            </div>

            <div className="sib-form-block sib-form-block-title">
              <p>Fale com a HDL</p>
            </div>

            <div className="sib-form-block sib-form-block-copy">
              <div className="sib-text-form-block">
                <p>Conte-nos sobre sua ideia e entraremos em contato em breve.</p>
              </div>
            </div>

            <div className="sib-input sib-form-block">
              <div className="form__entry entry_block">
                <div className="form__label-row">
                  <label className="entry__label" htmlFor="BREVE_DESCRICAO" data-required="*">
                    Breve descricao
                  </label>
                  <div className="entry__field">
                    <input
                      className="input"
                      maxLength="200"
                      type="text"
                      id="BREVE_DESCRICAO"
                      name="BREVE_DESCRICAO"
                      autoComplete="off"
                      placeholder="Conte-nos um pouco mais para acelerarmos o contato"
                      data-required="true"
                      required
                    />
                  </div>
                </div>

                <label className="entry__error entry__error--primary" />

                <label className="entry__specification">
                  Descreva rapidamente sua necessidade para direcionarmos o primeiro retorno.
                </label>
              </div>
            </div>

            <div className="sib-input sib-form-block">
              <div className="form__entry entry_block">
                <div className="form__label-row">
                  <label className="entry__label" htmlFor="EMAIL" data-required="*">
                    Insira seu e-mail para contato
                  </label>
                  <div className="entry__field">
                    <input
                      className="input"
                      type="email"
                      id="EMAIL"
                      name="EMAIL"
                      autoComplete="email"
                      defaultValue=""
                      placeholder="Digite aqui seu e-mail"
                      data-required="true"
                      required
                    />
                  </div>
                </div>

                <label className="entry__error entry__error--primary" />

                <label className="entry__specification">
                  Forneca um e-mail valido para entrarmos em contato com voce.
                </label>
              </div>
            </div>

            <div className="sib-form-block sib-form-block-submit">
              <button
                className="sib-form-block__button sib-form-block__button-with-loader"
                type="button"
                disabled={!isReady || submitState === 'loading'}
                onClick={handleSend}
              >
                <span>
                  {submitState === 'loading'
                    ? 'Enviando...'
                    : isReady
                      ? 'Enviar'
                      : 'Carregando formulario...'}
                </span>
              </button>
            </div>

            <input type="text" name="email_address_check" value="" className="input--hidden" readOnly />
            <input type="hidden" name="locale" value="pt" />
          </form>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isBrevoReady, setIsBrevoReady] = useState(false);
  const activeTheme = themeOptions.find(({ value }) => value === theme) ?? themeOptions[2];
  const ActiveThemeIcon = activeTheme.icon;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const resolvedTheme = theme === 'system'
        ? (mediaQuery.matches ? 'dark' : 'light')
        : theme;

      document.documentElement.dataset.theme = resolvedTheme;
      document.documentElement.style.colorScheme = resolvedTheme;
      document.querySelector('meta[name="theme-color"]')?.setAttribute(
        'content',
        resolvedTheme === 'dark' ? '#0b1824' : '#f6f2ea',
      );
    };

    applyTheme();

    try {
      window.localStorage.setItem('hdl-theme', theme);
    } catch {
      // The selected theme still works when storage is unavailable.
    }

    if (theme === 'system') {
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }

    return undefined;
  }, [theme]);

  useEffect(() => {
    let cancelled = false;

    const markReadyWhenAvailable = () => {
      if (!cancelled && window.grecaptcha && typeof window.grecaptcha.render === 'function') {
        setIsBrevoReady(true);
      }
    };

    if (document.querySelector('script[data-brevo-recaptcha="true"]')) {
      const readinessTimer = window.setInterval(markReadyWhenAvailable, 250);
      return () => {
        cancelled = true;
        window.clearInterval(readinessTimer);
      };
    }

    const recaptchaScript = document.createElement('script');
    recaptchaScript.src = 'https://www.google.com/recaptcha/api.js?hl=pt&render=explicit';
    recaptchaScript.async = true;
    recaptchaScript.defer = true;
    recaptchaScript.dataset.brevoRecaptcha = 'true';
    recaptchaScript.addEventListener('load', markReadyWhenAvailable, { once: true });
    document.body.appendChild(recaptchaScript);

    const readinessTimer = window.setInterval(markReadyWhenAvailable, 250);

    return () => {
      cancelled = true;
      window.clearInterval(readinessTimer);
    };
  }, []);

  useEffect(() => {
    if (!isContactModalOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsContactModalOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isContactModalOpen]);

  return (
    <div className="site-shell">
      <a className="skip-link" href="#conteudo">Ir para o conteúdo</a>

      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="HDL Soluções, início">
          <img className="brand-logo" src={hdlLogo} alt="HDL Soluções" />
        </a>

        <nav className="site-nav" aria-label="Navegação principal">
          <a href="#projetos">Projetos</a>
          <a href="#processo">Como fazemos</a>
          <a href="#sobre">Quem somos</a>
          <a href="#blog">Blog</a>
          <a href="#vagas">Vagas</a>
        </nav>

        <div className="header-actions">
          <details className="theme-menu">
            <summary aria-label={`Tema: ${activeTheme.label}`} title={`Tema: ${activeTheme.label}`}>
              <ActiveThemeIcon size={16} aria-hidden="true" />
              <span className="theme-current">{activeTheme.label}</span>
              <ChevronDown className="theme-chevron" size={14} aria-hidden="true" />
            </summary>
            <div className="theme-options" aria-label="Escolher tema">
              {themeOptions.map(({ value, label, icon: ThemeOptionIcon }) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={theme === value}
                  onClick={(event) => {
                    setTheme(value);
                    event.currentTarget.closest('details')?.removeAttribute('open');
                  }}
                >
                  <ThemeOptionIcon size={16} aria-hidden="true" />
                  <span>{label}</span>
                  <i aria-hidden="true" />
                </button>
              ))}
            </div>
          </details>

          <button className="header-contact" type="button" onClick={() => setIsContactModalOpen(true)}>
            <span>Fale com a HDL</span> <ArrowUpRight size={16} aria-hidden="true" />
          </button>
        </div>
      </header>

      <main id="conteudo">
        <section className="hero" id="inicio">
          <div className="hero-copy">
            <span className="eyebrow"><i /> Software que chega ao mundo real</span>
            <h1>Produtos digitais claros, úteis e prontos para rodar.</h1>
            <p>
              A HDL transforma problemas de negócio em experiências web e mobile,
              da primeira decisão ao produto em operação.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#projetos">
                Ver projetos <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a className="text-link" href="mailto:hdlgithub@gmail.com?subject=Quero%20conversar%20com%20a%20HDL">
                Tenho uma ideia <ArrowUpRight size={17} aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className="hero-visual" aria-label="Visão de um produto digital em operação">
            <div className="signal-card">
              <div className="signal-card-header">
                <span><i /> produto em operação</span>
                <Code2 size={20} aria-hidden="true" />
              </div>
              <div className="signal-main">
                <span>Ideia validada</span>
                <strong>Produto<br />entregue.</strong>
              </div>
              <div className="signal-progress"><i /></div>
              <div className="signal-footer">
                <span><CheckCircle size={16} /> Estratégia</span>
                <span><CheckCircle size={16} /> Design</span>
                <span><CheckCircle size={16} /> Código</span>
              </div>
            </div>
            <div className="hero-stamp">
              <span>HDL</span>
              <small>pensar · construir · evoluir</small>
            </div>
          </div>
        </section>

        <section className="value-section" aria-labelledby="value-title">
          <div className="value-intro">
            <span className="eyebrow eyebrow-light">O que isso significa para você</span>
            <h2 id="value-title">Capacidade completa para colocar uma boa ideia em movimento.</h2>
            <p>
              Você não contrata apenas código. A HDL conecta visão de negócio,
              experiência e engenharia para entregar algo que as pessoas consigam usar.
            </p>
          </div>
          <div className="value-grid">
            <article>
              <span>01</span>
              <strong>Produtos reais</strong>
              <p>Software pensado para ser usado, medido e evoluído, não apenas apresentado.</p>
            </article>
            <article>
              <span>02</span>
              <strong>Web + mobile</strong>
              <p>Experiências consistentes no navegador e no bolso de quem usa.</p>
            </article>
            <article>
              <span>03</span>
              <strong>Do escopo à evolução</strong>
              <p>Estratégia, design, código, publicação e melhoria contínua no mesmo fluxo.</p>
            </article>
            <article>
              <span>04</span>
              <strong>Time próximo</strong>
              <p>Contato direto com quem decide e constrói, sem ruído entre você e a entrega.</p>
            </article>
          </div>
        </section>

        <section className="section projects" id="projetos">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Projetos selecionados</span>
              <h2>O trabalho fala primeiro.</h2>
            </div>
            <p>
              Produtos criados para contextos diferentes, com a mesma atenção ao
              que precisa funcionar de verdade.
            </p>
          </div>

          <div className="content-notice" role="note">
            Nomes, textos e acessos abaixo são provisórios e aguardam validação da equipe.
          </div>

          <div className="projects-grid">
            {projects.map(({ name, description, icon: Icon, visual, status }, index) => (
              <article className={`project-card project-card-${visual}`} key={name}>
                <div className="project-meta">
                  <span className="project-number">0{index + 1}</span>
                  <span className="project-status">{status}</span>
                </div>
                <ProjectVisual type={visual} />
                <div className="project-copy">
                  <span className="project-icon"><Icon size={18} aria-hidden="true" /></span>
                  <div>
                    <h3>{name}</h3>
                    <p>{description}</p>
                  </div>
                </div>
                <span className="project-access">Acesso em validação</span>
              </article>
            ))}
          </div>
        </section>

        <section className="section process" id="processo">
          <div className="process-intro">
            <span className="eyebrow eyebrow-light">Como fazemos</span>
            <h2>Menos cerimônia.<br />Mais produto.</h2>
            <p>
              Entramos no problema, priorizamos o essencial e construímos em ciclos
              curtos, com decisões visíveis do início ao pós-lançamento.
            </p>
          </div>
          <ol className="process-list">
            <li><span>01</span><div><strong>Entender</strong><p>Objetivo, contexto e medida de sucesso.</p></div></li>
            <li><span>02</span><div><strong>Resolver</strong><p>Experiência, tecnologia e entrega lado a lado.</p></div></li>
            <li><span>03</span><div><strong>Evoluir</strong><p>Produto no ar, aprendizado e próximo ciclo.</p></div></li>
          </ol>
        </section>

        <section className="section about" id="sobre">
          <div className="about-story">
            <div>
              <span className="eyebrow">Quem somos</span>
              <h2>Tecnologia feita por gente que entende o peso da entrega.</h2>
            </div>
            <div className="about-copy">
              <p>
                Somos cinco desenvolvedores full-stack com experiência em energia,
                finanças e infraestrutura. Reunimos diferentes especialidades para
                resolver problemas de negócio sem separar estratégia de execução.
              </p>
              <p>
                Na HDL, quem participa da conversa também participa da construção.
                Isso mantém as decisões claras, o projeto próximo e a tecnologia a
                serviço do que realmente precisa funcionar.
              </p>
              <div className="about-signature">
                <span>5 especialistas</span>
                <span>Web · Mobile · Infra</span>
                <span>Uma equipe, ponta a ponta</span>
              </div>
            </div>
          </div>

          <div className="team-heading">
            <span>Quem constrói com você</span>
            <p>Experiências diferentes, responsabilidade compartilhada.</p>
          </div>
          <div className="team-grid">
            {team.map(({ name, role, photo }, index) => (
              <article className="team-member" key={name}>
                <div className="team-photo-wrap">
                  <img src={photo} alt={`Foto de ${name}`} loading="lazy" decoding="async" />
                  <span>0{index + 1}</span>
                </div>
                <h3>{name}</h3>
                <p>{role}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section journal" id="blog">
          <div className="section-heading journal-heading">
            <div>
              <span className="eyebrow"><BookOpen size={15} /> Caderno HDL</span>
              <h2>Ideias para construir melhor.</h2>
            </div>
            <span className="coming-label">Blog em preparação</span>
          </div>
          <div className="notes-grid">
            {notes.map(({ category, title }, index) => (
              <article className="note-card" key={title}>
                <span>{category} · 0{index + 1}</span>
                <h3>{title}</h3>
                <small>Conteúdo em breve</small>
              </article>
            ))}
          </div>
        </section>

        <section className="careers" id="vagas">
          <div className="careers-icon"><Briefcase size={25} aria-hidden="true" /></div>
          <div>
            <span className="eyebrow eyebrow-light">Trabalhe com a gente</span>
            <h2>Gosta de transformar problemas em produto?</h2>
          </div>
          <a href="mailto:hdlgithub@gmail.com?subject=Quero%20trabalhar%20com%20a%20HDL">
            Apresente-se <ArrowUpRight size={18} aria-hidden="true" />
          </a>
        </section>

        <section className="contact" id="contato">
          <div className="contact-kicker"><Mail size={18} /> Um canal direto, sem etapas desnecessárias.</div>
          <h2>Tem um problema que merece uma boa solução?</h2>
          <p>Abra o formulário e deixe seu e-mail para contato ou fale direto com o time da HDL.</p>
          <div className="contact-actions">
            <button className="contact-cta" type="button" onClick={() => setIsContactModalOpen(true)}>
              Abrir formulário <ArrowUpRight size={22} aria-hidden="true" />
            </button>
            <a className="contact-email" href="mailto:hdlgithub@gmail.com?subject=Novo%20projeto%20com%20a%20HDL">
              hdlgithub@gmail.com <ArrowUpRight size={30} aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand brand-footer" href="#inicio" aria-label="Voltar ao início">
          <img className="brand-logo" src={hdlLogo} alt="HDL Soluções" />
        </a>
        <p>Produtos digitais pensados para funcionar.</p>
        <span>© {new Date().getFullYear()} HDL Soluções</span>
      </footer>

      <div
        className={`contact-modal-backdrop${isContactModalOpen ? ' is-open' : ''}`}
        role="presentation"
        aria-hidden={isContactModalOpen ? 'false' : 'true'}
        onClick={() => setIsContactModalOpen(false)}
      >
        <section
          className="contact-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-modal-title"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="contact-modal-head">
            <div>
              <span className="contact-modal-kicker">Fale com a HDL</span>
              <h2 id="contact-modal-title">Vamos entender o seu projeto.</h2>
              <p>Preencha o formulário para deixarmos o retorno no seu melhor e-mail.</p>
            </div>
            <button
              className="contact-modal-close"
              type="button"
              aria-label="Fechar formulário de contato"
              onClick={() => setIsContactModalOpen(false)}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="contact-modal-frame">
            <BrevoContactForm isReady={isBrevoReady} />
          </div>

          <a className="contact-modal-email" href="mailto:hdlgithub@gmail.com?subject=Novo%20projeto%20com%20a%20HDL">
            Ou fale direto: hdlgithub@gmail.com <ArrowUpRight size={18} aria-hidden="true" />
          </a>
        </section>
      </div>
    </div>
  );
}

export default App;
