// db/influx.js
const { InfluxDB, Point } = require('@influxdata/influxdb-client');
const client = new InfluxDB({
  url:   process.env.INFLUX_URL   || 'http://localhost:8086',
  token: process.env.INFLUX_TOKEN || ''
});

const org    = process.env.INFLUX_ORG    || 'herbguard';
const bucket = process.env.INFLUX_BUCKET || 'sensors';

// Write API
const writeApi = client.getWriteApi(org, bucket, 'ms');

// Query API
const queryApi = client.getQueryApi(org);

// ── Write a sensor reading ────────────────
function writeSensorReading(potId, data) {
  const point = new Point('sensor_reading')
    .tag('pot_id', potId)
    .floatField('moisture',  data.moisture)
    .floatField('air_temp',  data.airTemp)
    .floatField('soil_temp', data.soilTemp)
    .floatField('humidity',  data.humidity)
    .floatField('ph',        data.ph)
    .floatField('light',     data.light)
    .timestamp(new Date());

  writeApi.writePoint(point);
  return writeApi.flush();
}

// ── Get latest reading for a pot ──────────
async function getLatestReading(potId) {
  const query = `
    from(bucket: "${bucket}")
      |> range(start: -1h)
      |> filter(fn: (r) => r._measurement == "sensor_reading")
      |> filter(fn: (r) => r.pot_id == "${potId}")
      |> last()
      |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  `;

  const rows = [];
  await new Promise((resolve, reject) => {
    queryApi.queryRows(query, {
      next(row, tableMeta) {
        rows.push(tableMeta.toObject(row));
      },
      error: reject,
      complete: resolve
    });
  });

  return rows[0] || null;
}

// ── Get history for a pot (last N hours) ──
async function getSensorHistory(potId, hours = 48) {
  const query = `
    from(bucket: "${bucket}")
      |> range(start: -${hours}h)
      |> filter(fn: (r) => r._measurement == "sensor_reading")
      |> filter(fn: (r) => r.pot_id == "${potId}")
      |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
      |> sort(columns: ["_time"], desc: true)
  `;

  const rows = [];
  await new Promise((resolve, reject) => {
    queryApi.queryRows(query, {
      next(row, tableMeta) {
        rows.push(tableMeta.toObject(row));
      },
      error: reject,
      complete: resolve
    });
  });
  return rows;

}

// ── Get latest readings for ALL pots ──────
async function getAllLatestReadings() {
  const query = `
    from(bucket: "${bucket}")
      |> range(start: -1h)
      |> filter(fn: (r) => r._measurement == "sensor_reading")
      |> last()
      |> pivot(rowKey:["_time", "pot_id"], columnKey: ["_field"], valueColumn: "_value")
  `;

  const rows = [];
  await new Promise((resolve, reject) => {
    queryApi.queryRows(query, {
      next(row, tableMeta) {
        rows.push(tableMeta.toObject(row));
      },
      error: reject,
      complete: resolve
    });
  });


  return rows;
}

async function getLastChangeTime(potId) {
  const query = `
    from(bucket: "${bucket}")
      |> range(start: -365d)
      |> filter(fn: (r) => r._measurement == "sensor_reading")
      |> filter(fn: (r) => r.pot_id == "${potId}")
      |> last()
      |> keep(columns: ["_time"])
  `;

  const rows = [];
  await new Promise((resolve, reject) => {
    queryApi.queryRows(query, {
      next(row, tableMeta) {
        rows.push(tableMeta.toObject(row));
      },
      error: reject,
      complete: resolve
    });
  });

  return rows[0]?._time || null;
}


module.exports = {
  writeSensorReading,
  getLatestReading,
  getSensorHistory,
  getAllLatestReadings,
  getLastChangeTime
};