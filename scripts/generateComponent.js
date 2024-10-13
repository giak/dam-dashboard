const fs = require('fs');
const path = require('path');

const componentName = process.argv[2];
if (!componentName) {
  console.error('Please provide a component name');
  process.exit(1);
}

const componentDir = path.join(__dirname, '..', 'src', 'components', componentName);
fs.mkdirSync(componentDir, { recursive: true });

const vueTemplate = `
<template>
  <div>
    <!-- ${componentName} component -->
  </div>
</template>

<script setup lang="ts">
// Component logic here
</script>
`;

fs.writeFileSync(path.join(componentDir, `${componentName}.vue`), vueTemplate.trim());
console.log(`Component ${componentName} created successfully.`);
