const express = require("express"); //npm install express
const cors = require("cors"); //npm install cors
const axios = require("axios");
const fs = require("fs");
const AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" });

const sqs = new AWS.SQS({ apiVersion: "2012-11-05" });
const QUEUE_URL =
  "https://sqs.us-east-1.amazonaws.com/165173101233/ventasparafranquicia";

const app = express();
const PORT = 4000;
app.use(cors());
app.use(express.json());

const leerJSON = () => {
  const data = fs.readFileSync("restaurante.json", "utf8");
  return JSON.parse(data);
};

app.get("/restaurante", (req, res) => {
  //get todo
  res.json(leerJSON());
});

app.get("/restaurante/ventas", (req, res) => {
  // get ventas
  res.json(leerJSON().restaurante.ventas);
});
app.get("/restaurante/personal", (req, res) => {
  //get personal
  res.json(leerJSON().restaurante.personal);
});

const escribirJSON = (data) => {
  fs.writeFileSync("restaurante.json", JSON.stringify(data, null, 2), "utf8");
};
app.post("/restaurante/ventas", (req, res) => {
  //postear ventas
  //autoincremental
  const restaurante = leerJSON();
  const nuevaVenta = req.body;

  // Obtener el último id y sumarle 1, o poner 1 si no hay ventas
  const ventas = restaurante.restaurante.ventas;
  //const nuevoId = ventas.length > 0 ? ventas[ventas.length - 1].id + 1 : 1;
  //nuevaVenta.id = nuevoId;

  ventas.push(nuevaVenta);
  escribirJSON(restaurante);

  res.status(201).json({ mensaje: "Venta agregada", venta: nuevaVenta });
});

app.delete("/restaurante/personal/:nombrePersonal", (req, res) => {
  // Eliminar personal por nombre
  const nombrePersonal = req.params.nombrePersonal;
  const restaurante = leerJSON();

  const nuevoPersonal = restaurante.restaurante.personal.filter(
    (p) => p.nombrePersonal !== nombrePersonal
  );

  if (nuevoPersonal.length === restaurante.restaurante.personal.length) {
    return res.status(404).json({ mensaje: "Personal no encontrado" });
  }

  restaurante.restaurante.personal = nuevoPersonal;
  escribirJSON(restaurante);

  res.status(200).json({ mensaje: "Personal eliminado" });
});

app.post("/restaurante/ventas/enviar-sqs", async (req, res) => {
  const restaurante = leerJSON();
  const ventas = restaurante.restaurante.ventas;

  if (!ventas || ventas.length === 0) {
    return res.status(404).json({ mensaje: "No hay ventas para enviar" });
  }

  let enviados = 0;
  let errores = [];

  // Enviar cada venta como mensaje individual al body de SQS
  for (const venta of ventas) {
    const params = {
      DelaySeconds: 0,
      MessageBody: JSON.stringify(venta),
      QueueUrl: QUEUE_URL,
    };

    try {
      await sqs.sendMessage(params).promise();
      enviados++;
    } catch (err) {
      errores.push({ venta, error: err.message });
    }
  }

  res.json({
    mensaje: `Ventas enviadas a SQS: ${enviados}`,
    errores,
  });
});

app.put("/restaurante/personal/:nombrePersonal", (req, res) => {
  const nombrePersonal = req.params.nombrePersonal;
  const nuevosDatos = req.body;
  const restaurante = leerJSON();

  const personal = restaurante.restaurante.personal;
  const persona = personal.find((p) => p.nombrePersonal === nombrePersonal);

  if (!persona) {
    return res.status(404).json({ mensaje: "Personal no encontrado" });
  }

  Object.assign(persona, nuevosDatos);
  escribirJSON(restaurante);

  res.json({ mensaje: "Personal actualizado", personal: persona });
});

app.listen(PORT, (err) => {
  //console.log(err);
  console.log(`app listening on port ${PORT}`);
});

//console.log("Hola");
