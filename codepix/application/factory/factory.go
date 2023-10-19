package factory

import (
	"github.com/jinzhu/gorm"
	"github.com/marcos-silva-rodrigues/imersao-full-cycle/tree/main/codepix/application/usecase"
	"github.com/marcos-silva-rodrigues/imersao-full-cycle/tree/main/codepix/infrastructure/repository"
)

func TransactionUseCaseFactory(database *gorm.DB) usecase.TransactionUseCase {
	pixRepository := repository.PixKeyRepositoryImpl{Db: database}
	transactionRepository := repository.TransactionRepositoryImpl{Db: database}

	transactionUseCase := usecase.TransactionUseCase{
		TransactionRepository: &transactionRepository,
		PixRepository:         pixRepository,
	}

	return transactionUseCase
}
