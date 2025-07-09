import './Home.css';

const Home = () => {
  return (
    <div className="home">
      <div className="hero-section">
        <div className="hero-content">
          <h1>Welcome to MERN Stack App</h1>
          <p>
            A complete full-stack application built with MongoDB, Express.js, React, and Node.js
          </p>
          <div className="hero-buttons">
            <a href="/register" className="btn btn-primary">
              Get Started
            </a>
            <a href="/login" className="btn btn-secondary">
              Login
            </a>
          </div>
        </div>
      </div>
      
      <div className="features-section">
        <div className="container">
          <h2>Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>🚀 Fast Development</h3>
              <p>Built with Vite for lightning-fast development experience</p>
            </div>
            <div className="feature-card">
              <h3>🔐 Authentication</h3>
              <p>Secure user authentication with JWT tokens</p>
            </div>
            <div className="feature-card">
              <h3>📱 Responsive Design</h3>
              <p>Mobile-first design that works on all devices</p>
            </div>
            <div className="feature-card">
              <h3>🗄️ Database Ready</h3>
              <p>MongoDB integration for scalable data storage</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
