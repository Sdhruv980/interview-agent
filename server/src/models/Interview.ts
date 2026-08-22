import mongoose, { Document, Schema } from 'mongoose';

export type InterviewStatus = 'pending' | 'in_progress' | 'completed';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface IQuestion {
  questionText: string;
  userAnswer: string;
  aiFeedback: string;
  score: number; // 0–10
}

export interface IInterview extends Document {
  userId: mongoose.Types.ObjectId;
  role: string;           // e.g. "Frontend Engineer"
  techStack: string[];    // e.g. ["React", "TypeScript"]
  difficulty: DifficultyLevel;
  status: InterviewStatus;
  questions: IQuestion[];
  overallScore: number | null;
  overallFeedback: string | null;
  creditsUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>({
  questionText: { type: String, required: true },
  userAnswer:   { type: String, default: '' },
  aiFeedback:   { type: String, default: '' },
  score:        { type: Number, default: 0, min: 0, max: 10 },
});

const InterviewSchema = new Schema<IInterview>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      required: [true, 'Job role is required'],
      trim: true,
    },
    techStack: {
      type: [String],
      default: [],
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending',
    },
    questions: {
      type: [QuestionSchema],
      default: [],
    },
    overallScore: {
      type: Number,
      default: null,
    },
    overallFeedback: {
      type: String,
      default: null,
    },
    creditsUsed: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IInterview>('Interview', InterviewSchema);
