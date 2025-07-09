import { Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = ({ user, logout }) => {
  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          MERN App
        </Link>
        
        <div className="nav-menu">
          <Link to="/" className="nav-link">
            Home
          </Link>
          
          {user ? (
            <>
              <Link to="/dashboard" className="nav-link">
                Dashboard
              </Link>
              <span className="nav-user">Welcome, {user.name}</span>
              <button onClick={logout} className="nav-button logout">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">
                Login
              </Link>
              <Link to="/register" className="nav-button register">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
