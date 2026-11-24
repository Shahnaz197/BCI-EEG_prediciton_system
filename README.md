EEG-Based Learning Ability Prediction Using Attention-Enhanced Encoder
Overview

This project presents a deep learning framework for predicting subject-level learning ability (Good vs Poor learners) from EEG signals. The model follows a two-stage training strategy to improve feature generalization and robustness.

Methodology
Stage 1: Trial-Level Pretraining

An ImprovedEEGNet architecture is trained to classify motor imagery trials (T1 vs T2).
This stage enables the encoder to learn meaningful EEG representations from raw signals.

Stage 2: Subject-Level Prediction

The pretrained encoder is reused and combined with a multi-head attention mechanism to aggregate trial-level features.
A subject-level classifier then predicts learning performance (Good vs Poor).

Key Components

CNN-based EEG encoder (ImprovedEEGNet)

Multi-head self-attention for feature refinement

Subject-level classification layer

Regularization via dropout

Cross-entropy loss optimization

Objective

The primary goal is to extract discriminative neural patterns from EEG signals and accurately predict learning performance while improving generalization across subjects.

Implementation

The project is implemented using:

PyTorch

MNE (EEG preprocessing)

Scikit-learn (evaluation metrics)
