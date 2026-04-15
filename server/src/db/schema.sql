CREATE TABLE IF NOT EXISTS cost_snapshots (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(255) NOT NULL,
  service VARCHAR(255) NOT NULL,
  cost DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cost_timeseries (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(255) NOT NULL,
  service VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  cost DECIMAL(10, 2) NOT NULL,
  granularity VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS anomalies (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(255) NOT NULL,
  service VARCHAR(255) NOT NULL,
  detected_at TIMESTAMP NOT NULL,
  expected_cost DECIMAL(10, 2) NOT NULL,
  actual_cost DECIMAL(10, 2) NOT NULL,
  deviation_percent DECIMAL(5, 2) NOT NULL,
  severity VARCHAR(50) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(50) CHECK (status IN ('open', 'acknowledged', 'resolved')),
  root_cause_hint TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  service VARCHAR(255),
  occurred_at TIMESTAMP NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recommendations (
  id SERIAL PRIMARY KEY,
  resource_id VARCHAR(255) NOT NULL,
  resource_type VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  estimated_savings DECIMAL(10, 2) NOT NULL,
  priority VARCHAR(50) CHECK (priority IN ('low', 'medium', 'high')),
  status VARCHAR(50) CHECK (status IN ('pending', 'applied', 'dismissed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
