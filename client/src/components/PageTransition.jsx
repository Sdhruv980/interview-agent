import { motion } from 'framer-motion';

const pageVariants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  in: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: [0.25, 1, 0.5, 1],
    },
  },
  out: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.15,
      ease: 'easeIn',
    },
  },
};

export default function PageTransition({ children }) {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}
