# Fetchja: Simplify Your JSON:API Interactions

Welcome to **Fetchja**, the ultimate JavaScript library designed to make your JSON:API interactions seamless and intuitive. Inspired by the renowned [Kitsu](https://github.com/wopian/kitsu) library, Fetchja leverages the native Fetch API, ensuring a lightweight and efficient experience.

## Why Fetchja?

- ⚡️ **Lightweight and Fast**: Built on the native Fetch API, Fetchja ensures minimal overhead and maximum performance.
- 🎨 **Intuitive Design**: Easy-to-understand methods and configurations make Fetchja accessible for developers of all levels.
- 💪 **Flexible and Customizable**: Tailor Fetchja to your needs with customizable headers, query parameters, and resource cases.

## Installation

To get started with Fetchja, simply install it via `npm` along with the `pluralize` library:

```bash
$ npm install fetchja pluralize
```

## Getting Started

Here's a quick example to get you up and running with Fetchja:

```javascript
import { Fetchja } from 'fetchja'

const api = new Fetchja({
  baseURL: 'https://api.example.com'
});

try {
  const response = await api.get('/posts')
  console.log(response)
} catch (error) {
  console.error(error)
}
```
