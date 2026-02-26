export interface SkillCategory {
  label: string;
  skills: string[];
}

export const SKILL_TREE: SkillCategory[] = [
  {
    label: "Языки программирования",
    skills: [
      "Python", "JavaScript", "TypeScript", "Java", "C#", "Go", "Rust",
      "C++", "C", "PHP", "Ruby", "Kotlin", "Swift", "Scala", "R", "Dart",
      "Lua", "Perl", "Haskell", "Elixir", "Clojure",
    ],
  },
  {
    label: "Frontend",
    skills: [
      "React", "Vue.js", "Angular", "Next.js", "Nuxt.js", "Svelte",
      "HTML", "CSS", "Tailwind CSS", "SASS", "LESS", "Redux", "MobX",
      "Zustand", "Webpack", "Vite", "Storybook", "Styled Components",
      "Material UI", "Ant Design", "Bootstrap",
    ],
  },
  {
    label: "Backend",
    skills: [
      "Node.js", "Django", "FastAPI", "Spring Boot", "Express.js", "NestJS",
      "Flask", "Laravel", "ASP.NET", "Ruby on Rails", "Gin", "Fiber",
      "Actix", "Koa", "Hapi", "Fastify",
    ],
  },
  {
    label: "Данные",
    skills: [
      "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
      "ClickHouse", "Apache Kafka", "RabbitMQ", "SQLite", "Oracle",
      "MS SQL Server", "Cassandra", "DynamoDB", "Neo4j", "InfluxDB",
    ],
  },
  {
    label: "DevOps & Инфраструктура",
    skills: [
      "Docker", "Kubernetes", "CI/CD", "AWS", "GCP", "Azure", "Terraform",
      "Ansible", "Linux", "Nginx", "GitLab CI", "GitHub Actions", "Jenkins",
      "Prometheus", "Grafana", "ELK Stack", "Helm", "Vault",
    ],
  },
  {
    label: "Data Science / ML",
    skills: [
      "TensorFlow", "PyTorch", "Pandas", "NumPy", "Scikit-learn", "Keras",
      "OpenCV", "NLP", "Computer Vision", "Spark", "Airflow", "MLflow",
      "Hugging Face", "LangChain", "Deep Learning", "Статистика",
      "A/B тестирование",
    ],
  },
  {
    label: "Мобильная разработка",
    skills: [
      "React Native", "Flutter", "iOS", "Android", "SwiftUI",
      "Jetpack Compose", "Kotlin Multiplatform", "Xamarin", "Ionic",
    ],
  },
  {
    label: "Тестирование",
    skills: [
      "Jest", "Pytest", "Selenium", "Cypress", "JUnit", "Mocha",
      "Playwright", "Vitest", "Testing Library", "Postman", "k6",
      "Автотестирование", "Нагрузочное тестирование",
    ],
  },
  {
    label: "Инструменты & Практики",
    skills: [
      "Git", "Jira", "Figma", "Swagger", "GraphQL", "REST API", "gRPC",
      "WebSocket", "Agile", "Scrum", "Kanban", "Микросервисы",
      "Системный дизайн", "Code Review", "ООП", "Функциональное программирование",
    ],
  },
];

/** Flat set of all predefined skills for O(1) lookup */
export const ALL_SKILLS = new Set(SKILL_TREE.flatMap((c) => c.skills));
