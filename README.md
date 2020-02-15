## Description
AI plays a snake game trained using deep reinforcement Q-learning.

For training, the toolkit [OpenAI Gym](https://github.com/openai/gym) and the implementation of deep Q-learning algorithm [OpenAI Baselines](https://github.com/openai/baselines) were used.

For the board size of 6x6 cells, the neural network body consists of a rectified convolutional layer followed by a residual block, which consists of two rectified convolutional layers with a skip connection. Each convolution applies 32 filters of kernel size 3x3 with stride 1.

To show the pre-trained model in action in a browser the library [TensorFlow.js](https://www.tensorflow.org/js) is used.

## Run
[Open on GitHub Pages](https://iliagrigorevdev.github.io/ai-snake/)
