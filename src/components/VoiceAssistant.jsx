import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import jsPDF from 'jspdf'
import './VoiceAssistant.css'

const VoiceAssistant = ({ onFormDataUpdate, isActive, onClose }) => {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [conversation, setConversation] = useState([])
  const [currentStep, setCurrentStep] = useState('idle')
  const [formData, setFormData] = useState({})
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0)
  const [waitingForConfirmation, setWaitingForConfirmation] = useState(false)
  const recognitionRef = useRef(null)
  const audioRef = useRef(null)
  const suppressRecognitionRef = useRef(false)
  const navigate = useNavigate()

  const ONDEMAND_API_KEY = 'cJP3spu2jknHr9XWzGEatDgKH3F4u2pL'
  const TTS_API_URL = 'https://api.on-demand.io/services/v1/public/service/execute/text_to_speech'

  const formFields = [
    { key: 'Full Name', label: 'Full Name', prompt: 'What is your full name?' },
    { key: "Father's Name", label: "Father's Name", prompt: "What is your father's name?" },
    { key: 'Date of Birth', label: 'Date of Birth', prompt: 'What is your date of birth? Please say it in day, month, year format.' },
    { key: 'Address', label: 'Address', prompt: 'What is your complete address?' },
    { key: 'Annual Income', label: 'Annual Income', prompt: 'What is your annual income?' },
    { key: 'Occupation', label: 'Occupation', prompt: 'What is your occupation?' },
    { key: 'PAN Number', label: 'PAN Number', prompt: 'What is your PAN number?' }
  ]

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        if (suppressRecognitionRef.current) return
        handleUserInput(transcript)
      }

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
        speakText("Sorry, I couldn't hear you clearly. Please try again.")
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (isActive && currentStep === 'idle' && conversation.length === 0) {
      startConversation()
    }
  }, [isActive])

  const speakText = async (text) => {
    if (!text) return

    setIsSpeaking(true)
    addToConversation('assistant', text)

    try {
      if (recognitionRef.current && typeof recognitionRef.current.stop === 'function') {
        suppressRecognitionRef.current = true
        try { recognitionRef.current.stop() } catch(e) {}
      }
    } catch (e) {
      console.warn('Error stopping recognition before TTS', e)
    }

    try {
      const response = await axios.post(
        TTS_API_URL,
        {
          input: text,
          voice: 'nova',
          model: 'tts-1-hd'
        },
        {
          headers: {
            'apikey': ONDEMAND_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.data?.data?.audioUrl) {
        const audio = new Audio(response.data.data.audioUrl)
        audioRef.current = audio
        audio.onended = () => {
          setIsSpeaking(false)
          suppressRecognitionRef.current = false
        }
        audio.onerror = () => {
          setIsSpeaking(false)
          fallbackTTS(text)
        }
        audio.play()
      } else {
        fallbackTTS(text)
      }
    } catch (error) {
      console.error('TTS Error:', error)
      fallbackTTS(text)
    }
  }

  const fallbackTTS = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.onend = () => {
        setIsSpeaking(false)
        suppressRecognitionRef.current = false
      }
      utterance.onerror = () => {
        setIsSpeaking(false)
        suppressRecognitionRef.current = false
      }
      speechSynthesis.speak(utterance)
    } else {
      setIsSpeaking(false)
      suppressRecognitionRef.current = false
    }
  }

  const startListening = () => {
    if (isSpeaking) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel()
      }
      setIsSpeaking(false)
    }

    if (recognitionRef.current && !isListening) {
      setIsListening(true)
      suppressRecognitionRef.current = false
      recognitionRef.current.start()
    }
  }

  const handleUserInput = (userText) => {
    addToConversation('user', userText)
    processCommand(userText.trim())
  }

  const processCommand = (command) => {
    const lowerCommand = command.toLowerCase()

    if (waitingForConfirmation) {
      handleConfirmation(command)
      return
    }

    if (currentStep === 'collecting') {
      handleFieldInput(command)
      return
    }

    if (lowerCommand.includes('income') ||
        lowerCommand.includes('certificate') ||
        lowerCommand.includes('start') ||
        lowerCommand.includes('begin') ||
        lowerCommand.includes('fill') ||
        lowerCommand.includes('form')) {
      startFormFilling()
      return
    }

    const greeting = "Hello! I'm your voice assistant. I can help you fill out an Income Certificate form. Say 'start' or 'income certificate' to begin."
    speakText(greeting)
  }

  const startConversation = () => {
    const greeting = "Hello! I'm your voice assistant. I can help you fill out an Income Certificate form. Say 'start' to begin filling the form."
    speakText(greeting)
  }

  const startFormFilling = () => {
    navigate('/govt-affidavits')
    setCurrentStep('collecting')
    setCurrentFieldIndex(0)
    setFormData({})

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('selectAffidavit', {
        detail: {
          id: 'income',
          name: 'Income Certificate Affidavit',
          fields: formFields.map(f => f.label)
        }
      }))

      const firstPrompt = `Great! Let's start filling the Income Certificate form. ${formFields[0].prompt}`
      speakText(firstPrompt)
    }, 800)
  }

  const handleFieldInput = (input) => {
    if (currentFieldIndex >= formFields.length) return

    const currentField = formFields[currentFieldIndex]
    const newFormData = {
      ...formData,
      [currentField.key]: input
    }

    setFormData(newFormData)

    if (onFormDataUpdate) {
      onFormDataUpdate(newFormData)
    }

    window.dispatchEvent(new CustomEvent('voiceFormUpdated', { detail: newFormData }))

    const nextIndex = currentFieldIndex + 1
    setCurrentFieldIndex(nextIndex)

    if (nextIndex >= formFields.length) {
      setWaitingForConfirmation(true)
      const confirmMsg = "Perfect! I have collected all the information. Would you like me to generate the PDF now? Please say yes or no."
      speakText(confirmMsg)
    } else {
      const nextField = formFields[nextIndex]
      speakText(nextField.prompt)
    }
  }

  const handleConfirmation = (command) => {
    const lowerCommand = command.toLowerCase()

    if (lowerCommand.includes('yes') || lowerCommand.includes('sure') ||
        lowerCommand.includes('ok') || lowerCommand.includes('generate') ||
        lowerCommand.includes('please')) {
      setWaitingForConfirmation(false)
      generatePDF()
    } else if (lowerCommand.includes('no') || lowerCommand.includes('cancel')) {
      setWaitingForConfirmation(false)
      setCurrentStep('idle')
      setFormData({})
      setCurrentFieldIndex(0)
      speakText("Okay, the form has been cancelled. You can start over anytime by saying 'start'.")
    } else {
      speakText("I didn't understand. Please say yes to generate the PDF, or no to cancel.")
    }
  }

  const generatePDF = () => {
    speakText("Generating your PDF now. Please wait...")

    setTimeout(() => {
      const doc = new jsPDF()

      doc.setFontSize(20)
      doc.text('INCOME CERTIFICATE AFFIDAVIT', 105, 20, { align: 'center' })

      doc.setFontSize(12)
      let yPos = 40

      const name = formData['Full Name'] || 'N/A'
      const fatherName = formData["Father's Name"] || 'N/A'
      const address = formData['Address'] || 'N/A'

      doc.text(`I, ${name}, son/daughter of ${fatherName},`, 20, yPos)
      yPos += 10
      doc.text(`residing at ${address},`, 20, yPos)
      yPos += 10
      doc.text(`hereby solemnly affirm and declare as under:`, 20, yPos)
      yPos += 15

      formFields.forEach((field, index) => {
        if (formData[field.key]) {
          doc.text(`${index + 1}. ${field.label}: ${formData[field.key]}`, 20, yPos)
          yPos += 10
        }
      })

      yPos += 10
      doc.text(`I hereby declare that the above statements are true and correct`, 20, yPos)
      yPos += 5
      doc.text(`to the best of my knowledge and belief.`, 20, yPos)
      yPos += 20
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPos)
      yPos += 10
      doc.text(`Signature: _________________`, 20, yPos)

      doc.save('Income_Certificate_Affidavit.pdf')

      setCurrentStep('idle')
      setFormData({})
      setCurrentFieldIndex(0)

      const successMsg = "Your PDF has been generated and downloaded successfully! Is there anything else I can help you with? You can say 'start' to fill another form."
      speakText(successMsg)
    }, 1000)
  }

  const addToConversation = (role, text) => {
    setConversation(prev => [...prev, { role, text, timestamp: new Date() }])
  }

  if (!isActive) return null

  return (
    <motion.div
      className="voice-assistant"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <div className="voice-assistant-header">
        <h3>Voice Assistant</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="voice-assistant-body">
        <div className="conversation-container">
          <AnimatePresence>
            {conversation.map((msg, index) => (
              <motion.div
                key={index}
                className={`message ${msg.role}`}
                initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="message-content">{msg.text}</div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="voice-controls">
          <motion.button
            className={`voice-button ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}
            onClick={startListening}
            disabled={isSpeaking}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isListening ? (
              <>
                <span className="pulse-ring"></span>
                <span>Listening...</span>
              </>
            ) : isSpeaking ? (
              'Speaking...'
            ) : (
              'Tap to Speak'
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

export default VoiceAssistant
