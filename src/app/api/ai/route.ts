import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export async function POST(req: NextRequest) {
  try {
    const { message, context } = await req.json();

    const zai = await ZAI.create();

    const systemPrompt = `Tu es l'assistant IA de PlanningPro, une application de gestion d'emplois du temps pour établissements scolaires et universitaires. Tu aides les utilisateurs à:
- Créer et organiser des emplois du temps
- Résoudre les conflits d'emploi du temps
- Optimiser la répartition des cours
- Répondre aux questions sur l'utilisation de l'application
- Suggérer des améliorations d'organisation

Tu réponds toujours en français, de manière concise et professionnelle. Tu utilises un style terminal/brutaliste cohérent avec l'identité visuelle de PlanningPro.

Contexte actuel: ${context || "Aucun contexte spécifique"}`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const response =
      completion.choices[0]?.message?.content ||
      "Désolé, je n'ai pas pu générer une réponse.";

    return NextResponse.json({ response });
  } catch (error) {
    console.error("AI assistant error:", error);
    return NextResponse.json(
      {
        response:
          "L'assistant IA est temporairement indisponible. Veuillez réessayer plus tard.",
      },
      { status: 500 }
    );
  }
}
