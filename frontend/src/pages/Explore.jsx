import { Link } from "react-router-dom";

export default function Explore() {
  return (
    <div style={{ padding: 20 }}>
      <h2>Explore Restaurants</h2>

      <input
        placeholder="Search restaurants..."
        style={{ padding: 8, width: 300, marginBottom: 20 }}
      />

      <div style={{ display: "flex", gap: 16 }}>
        {/* Fake restaurant card */}
        <div style={{ border: "1px solid #ccc", padding: 12, width: 200 }}>
          <h4>Pasta Paradise</h4>
          <p>Italian • $$</p>
          <Link to="/restaurant/1">View Details</Link>
        </div>

        <div style={{ border: "1px solid #ccc", padding: 12, width: 200 }}>
          <h4>Green Leaf Café</h4>
          <p>Vegan • $</p>
          <Link to="/restaurant/2">View Details</Link>
        </div>
      </div>
    </div>
  );
}