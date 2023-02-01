package vetpkg2

import (
	"context"
	"log"
)

func main() {
	test := "hello, world"

	test = test

	ctx, cancel := context.WithCancel(context.Background())
	ctx.Err()
	if cancel == nil {
		log.Printf("Error %s")
	}
	return

	log.Println("done")
}
