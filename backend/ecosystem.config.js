module.exports = {
  apps: [
    {
      name: "quantum-doc-backend",
      script: "uvicorn",
      args: "src.app:app --port 8121",
      watch: false,
      instances: 1,
      env: {
        ENVIRONMENT: "production",
      },
    },
  ],
};
